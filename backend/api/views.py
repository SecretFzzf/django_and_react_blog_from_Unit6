"""
墨韵博客 - 视图层

接口分组：
    认证    /api/token/            /api/token/refresh/     /api/auth/logout/
    账号    /api/register/         /api/auth/password/*
    用户    /api/profile/*
    文章    /api/blogs/*
    标签    /api/tags/
    收藏    /api/favorites/
    评论    /api/comments/*

安全修复（原项目缺失）：
    1. 文章的更新 / 删除增加了归属校验，非作者一律 403。
    2. 评论删除增加归属校验。
    3. 点赞 / 评论的用户身份一律取自 JWT，不再信任前端传入的 user 字段。
    4. 未发布文章仅作者本人可见。
"""

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.cache import cache
from django.core.mail import send_mail
from django.db.models import Count, F, Q, Sum
from django.utils import timezone as dj_timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .models import Blog, Comment, Favorite, Profile, Tag
from .pagination import StandardPagination
from .serializers import (
    BlogArchiveSerializer,
    BlogListSerializer,
    BlogSerializer,
    CommentCreateSerializer,
    CommentSerializer,
    FavoriteSerializer,
    LogoutSerializer,
    PasswordChangeSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    ProfileSerializer,
    ProfileUpdateSerializer,
    RegisterSerializer,
    TagSerializer,
)


# ==================================================================
# 通用工具
# ==================================================================
def paginate(request, queryset, serializer_class, **serializer_kwargs):
    """统一分页响应，前端只需解析 results / count / total_pages。"""
    paginator = StandardPagination()
    page = paginator.paginate_queryset(queryset, request)
    serializer = serializer_class(
        page, many=True, context={'request': request}, **serializer_kwargs)
    return paginator.get_paginated_response(serializer.data)


def base_blog_queryset():
    """文章基础查询集：只取已发布，并预加载关联对象避免 N+1 查询。"""
    return (
        Blog.objects
        .filter(publish_status=True)
        .select_related('author')
        .prefetch_related('tags', 'likes', 'favorited_by', 'comments')
    )


# ==================================================================
# 认证
# ==================================================================
class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    """登录：签发 Access + Refresh 双令牌，并附带用户资料。"""

    default_error_messages = {
        **TokenObtainPairSerializer.default_error_messages,
        'no_active_account': '用户名或密码错误，请重新输入。',
    }

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username'] = user.username
        token['nickname'] = user.display_name
        token['photo'] = user.photo_url or ''
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = ProfileSerializer(
            self.user, context=self.context).data
        return data


class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer


class MyTokenRefreshView(TokenRefreshView):
    """刷新令牌（开启轮换后会自动下发新的 refresh）。"""

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        # 刷新失败时把英文提示替换为中文
        if response.status_code == status.HTTP_401_UNAUTHORIZED:
            response.data = {
                'detail': '登录状态已失效，请重新登录。',
                'message': '登录状态已失效，请重新登录。',
            }
        return response


@api_view(['POST'])
@permission_classes([AllowAny])
def registerUser(request):
    """账号注册。"""
    serializer = RegisterSerializer(
        data=request.data, context={'request': request})
    if serializer.is_valid():
        user = serializer.save()
        return Response(
            {
                'detail': '注册成功，欢迎加入墨韵博客！',
                'user': ProfileSerializer(
                    user, context={'request': request}).data,
            },
            status=status.HTTP_201_CREATED,
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logoutUser(request):
    """退出登录：把 refresh token 加入黑名单，防止被继续使用。"""
    serializer = LogoutSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    refresh = serializer.validated_data.get('refresh')

    if refresh:
        try:
            RefreshToken(refresh).blacklist()
        except Exception:
            # 令牌已过期 / 已失效，对用户而言等同于退出成功
            pass
    return Response({'detail': '已安全退出登录。'})


# ==================================================================
# 密码：修改 / 忘记 / 重置
# ==================================================================
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def changePassword(request):
    """已登录用户修改密码。"""
    serializer = PasswordChangeSerializer(
        data=request.data, context={'request': request})
    if serializer.is_valid():
        serializer.save()
        return Response({'detail': '密码修改成功，请使用新密码重新登录。'})
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def requestPasswordReset(request):
    """
    忘记密码：向绑定邮箱发送带安全令牌的重置链接。

    链接形如：{FRONTEND_URL}/reset-password/{uid}/{token}
    若未配置 SMTP，邮件内容会打印在后端控制台；
    开发模式下同时在响应里返回 reset_link，便于直接调试。
    """
    serializer = PasswordResetRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    email = serializer.validated_data['email']

    # 简易防刷：同一邮箱 60 秒内只能申请一次
    cache_key = f'pwd_reset_cooldown_{email}'
    if cache.get(cache_key):
        return Response(
            {'detail': '请求过于频繁，请 1 分钟后再试。'},
            status=status.HTTP_429_TOO_MANY_REQUESTS)
    cache.set(cache_key, True, 60)

    user = Profile.objects.filter(email__iexact=email, is_active=True).first()
    if user is None:
        # 前面的校验器已拦截，这里仅作防御
        return Response({'detail': '该邮箱未注册，请检查后重试。'},
                        status=status.HTTP_400_BAD_REQUEST)

    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    frontend = settings.FRONTEND_URL.rstrip('/')
    reset_link = f'{frontend}/reset-password/{uid}/{token}'

    subject = f'【{settings.SITE_NAME}】密码重置通知'
    message = (
        f'您好，{user.display_name}：\n\n'
        f'我们收到了您在「{settings.SITE_NAME}」的密码重置请求。\n'
        f'请点击下面的链接设置新密码（30 分钟内有效）：\n\n'
        f'{reset_link}\n\n'
        f'如果这不是您本人的操作，请忽略本邮件，您的密码不会发生任何变化。\n\n'
        f'—— {settings.SITE_NAME}'
    )

    try:
        send_mail(subject, message, settings.DEFAULT_FROM_EMAIL,
                  [user.email], fail_silently=True)
    except Exception:
        pass

    payload = {
        'detail': f'重置链接已发送至 {mask_email(user.email)}，请在 30 分钟内完成重置。',
    }
    # 开发环境直接把链接返回，省去翻找控制台的麻烦
    if settings.DEBUG:
        payload['reset_link'] = reset_link
        payload['uid'] = uid
        payload['token'] = token

    return Response(payload)


@api_view(['POST'])
@permission_classes([AllowAny])
def confirmPasswordReset(request):
    """凭 uid + token 设置新密码。"""
    serializer = PasswordResetConfirmSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    uid = serializer.validated_data['uid']
    token = serializer.validated_data['token']
    new_password = serializer.validated_data['new_password']

    try:
        user_id = force_str(urlsafe_base64_decode(uid))
        user = Profile.objects.get(pk=user_id, is_active=True)
    except (TypeError, ValueError, OverflowError, Profile.DoesNotExist):
        return Response(
            {'detail': '重置链接无效或已过期，请重新申请。'},
            status=status.HTTP_400_BAD_REQUEST)

    if not default_token_generator.check_token(user, token):
        return Response(
            {'detail': '重置链接无效或已过期，请重新申请。'},
            status=status.HTTP_400_BAD_REQUEST)

    user.set_password(new_password)
    user.save(update_fields=['password'])
    return Response({'detail': '密码重置成功，请使用新密码登录。'})


@api_view(['POST'])
@permission_classes([AllowAny])
def verifyResetToken(request):
    """校验重置链接是否仍然有效，供前端进入页面时预检。"""
    uid = request.data.get('uid', '')
    token = request.data.get('token', '')
    try:
        user_id = force_str(urlsafe_base64_decode(uid))
        user = Profile.objects.get(pk=user_id, is_active=True)
    except (TypeError, ValueError, OverflowError, Profile.DoesNotExist):
        return Response({'valid': False, 'detail': '重置链接无效或已过期。'})

    valid = default_token_generator.check_token(user, token)
    return Response({
        'valid': valid,
        'username': user.username,
        'detail': '链接有效。' if valid else '重置链接无效或已过期，请重新申请。',
    })


def mask_email(email):
    """脱敏展示邮箱：ab***@qq.com"""
    if not email or '@' not in email:
        return email
    name, domain = email.split('@', 1)
    if len(name) <= 2:
        masked = name[:1] + '***'
    else:
        masked = name[:2] + '***'
    return f'{masked}@{domain}'


# ==================================================================
# 用户资料
# ==================================================================
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def getMyProfile(request):
    """获取当前登录用户的完整资料。"""
    serializer = ProfileSerializer(request.user, context={'request': request})
    return Response(serializer.data)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def updateMyProfile(request):
    """修改当前登录用户的资料（昵称 / 简介 / 社交链接 / 头像）。"""
    user = request.user
    partial = request.method == 'PATCH'
    serializer = ProfileUpdateSerializer(
        user, data=request.data, partial=partial, context={'request': request})
    if serializer.is_valid():
        serializer.save()
        return Response({
            'detail': '资料更新成功。',
            'user': ProfileSerializer(user, context={'request': request}).data,
        })
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([AllowAny])
def getProfile(request, pk):
    """查看指定用户的公开资料。"""
    profile = Profile.objects.filter(pk=pk).first()
    if profile is None:
        return Response({'detail': '该用户不存在。'},
                        status=status.HTTP_404_NOT_FOUND)
    serializer = ProfileSerializer(profile, context={'request': request})
    return Response(serializer.data)


# ==================================================================
# 文章：读
# ==================================================================
@api_view(['GET'])
@permission_classes([AllowAny])
def getBlogs(request):
    """
    文章列表。

    支持的查询参数：
        category  分类 key（tech / frontend / ...）
        tag       标签名或标签 slug
        author    作者 id 或用户名
        search    关键词（标题 / 正文 / 分类 / 作者 / 标签）
        ordering  newest | oldest | popular | likes | comments
        page      页码
        page_size 每页条数
    """
    queryset = base_blog_queryset()

    category = request.GET.get('category')
    if category:
        queryset = queryset.filter(category=category)

    tag = request.GET.get('tag')
    if tag:
        queryset = queryset.filter(
            Q(tags__name__iexact=tag) | Q(tags__slug=tag)).distinct()

    author = request.GET.get('author')
    if author:
        if str(author).isdigit():
            queryset = queryset.filter(author_id=author)
        else:
            queryset = queryset.filter(author__username=author)

    search = request.GET.get('search') or request.GET.get('q')
    if search:
        keyword = search.strip()
        queryset = queryset.filter(
            Q(title__icontains=keyword) |
            Q(content__icontains=keyword) |
            Q(author__username__icontains=keyword) |
            Q(author__nickname__icontains=keyword) |
            Q(tags__name__icontains=keyword)
        ).distinct()

    ordering = request.GET.get('ordering', 'newest')
    ordering_map = {
        'newest': ('-is_top', '-created_at'),
        'oldest': ('-is_top', 'created_at'),
        'popular': ('-is_top', '-views', '-created_at'),
        'likes': ('-is_top', '-created_at'),
        'comments': ('-is_top', '-created_at'),
    }
    queryset = queryset.order_by(*ordering_map.get(ordering, ('-is_top', '-created_at')))

    return paginate(request, queryset, BlogListSerializer)


@api_view(['GET'])
@permission_classes([AllowAny])
def getBlog(request, pk):
    """
    文章详情。

    浏览量安全递增：使用 F() 表达式在数据库层面原子自增，
    避免并发请求下的「读改写」竞态导致计数丢失；
    作者本人访问不计入浏览量。
    """
    blog = (
        Blog.objects
        .select_related('author')
        .prefetch_related('tags', 'likes', 'favorited_by', 'comments__user')
        .filter(pk=pk)
        .first()
    )
    if blog is None:
        return Response({'detail': '文章不存在或已被删除。'},
                        status=status.HTTP_404_NOT_FOUND)

    is_owner = (
        request.user.is_authenticated and blog.author_id == request.user.pk)

    # 草稿只有作者本人可见
    if not blog.publish_status and not is_owner:
        return Response({'detail': '该文章尚未发布。'},
                        status=status.HTTP_403_FORBIDDEN)

    if not is_owner:
        Blog.objects.filter(pk=pk).update(views=F('views') + 1)
        blog.refresh_from_db(fields=['views'])

    serializer = BlogSerializer(blog, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def getHotBlogs(request):
    """热门文章榜单：浏览量优先，其次点赞与评论热度。"""
    try:
        limit = min(int(request.GET.get('limit', 6)), 20)
    except (TypeError, ValueError):
        limit = 6

    queryset = (
        Blog.objects
        .filter(publish_status=True)
        .select_related('author')
        .prefetch_related('tags', 'likes', 'favorited_by', 'comments')
        .annotate(
            likes_count=Count('likes', distinct=True),
            comments_count=Count('comments', distinct=True),
        )
        .order_by('-views', '-likes_count', '-comments_count', '-created_at')[:limit]
    )

    serializer = BlogListSerializer(
        queryset, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def getArchive(request):
    """
    时间线归档：按「年 -> 月」分段。

    返回结构：
        {
            "total": 26,
            "years": [{year, count, months: [{month, count}]}],
            "groups": [{year, month, label, count, blogs: [...]}]
        }
    """
    queryset = base_blog_queryset().order_by('-created_at')

    year = request.GET.get('year')
    if year:
        queryset = queryset.filter(created_at__year=year)

    month = request.GET.get('month')
    if month:
        queryset = queryset.filter(created_at__month=month)

    category = request.GET.get('category')
    if category:
        queryset = queryset.filter(category=category)

    tag = request.GET.get('tag')
    if tag:
        queryset = queryset.filter(
            Q(tags__name__iexact=tag) | Q(tags__slug=tag)).distinct()

    search = request.GET.get('search')
    if search:
        queryset = queryset.filter(
            Q(title__icontains=search) | Q(content__icontains=search)).distinct()

    groups = []
    index = {}
    for blog in queryset:
        dt = dj_timezone.localtime(blog.created_at)
        key = f'{dt.year}-{dt.month:02d}'
        if key not in index:
            entry = {
                'key': key,
                'year': dt.year,
                'month': dt.month,
                'label': f'{dt.year} 年 {dt.month} 月',
                'count': 0,
                'blogs': [],
            }
            index[key] = entry
            groups.append(entry)
        index[key]['count'] += 1
        index[key]['blogs'].append(
            BlogArchiveSerializer(blog, context={'request': request}).data)

    # 年份汇总（供侧边栏导航使用）
    years = []
    year_index = {}
    for group in groups:
        y = group['year']
        if y not in year_index:
            entry = {'year': y, 'count': 0, 'months': []}
            year_index[y] = entry
            years.append(entry)
        year_index[y]['count'] += group['count']
        year_index[y]['months'].append(
            {'month': group['month'], 'count': group['count'], 'key': group['key']})

    return Response({
        'total': sum(g['count'] for g in groups),
        'years': years,
        'groups': groups,
        'current_year': int(year) if year else None,
        'current_month': int(month) if month else None,
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def getCategory(request):
    """分类列表：附带每个分类下的已发布文章数。"""
    counts = dict(
        Blog.objects
        .filter(publish_status=True)
        .values_list('category')
        .annotate(total=Count('id'))
    )
    data = [
        {
            'value': value,
            'label': label,
            'count': counts.get(value, 0),
        }
        for value, label in Blog.CATEGORY_CHOICES
    ]
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def getMyBlogs(request):
    """我的文章（含草稿）。"""
    queryset = (
        Blog.objects
        .filter(author=request.user)
        .select_related('author')
        .prefetch_related('tags', 'likes', 'favorited_by', 'comments')
        .order_by('-is_top', '-created_at')
    )

    status_filter = request.GET.get('status')
    if status_filter == 'published':
        queryset = queryset.filter(publish_status=True)
    elif status_filter == 'draft':
        queryset = queryset.filter(publish_status=False)

    category = request.GET.get('category')
    if category:
        queryset = queryset.filter(category=category)

    return paginate(request, queryset, BlogListSerializer)


# ==================================================================
# 文章：写
# ==================================================================
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def createBlog(request):
    """
    发布文章。

    注意：author 一律取自 JWT 登录态，不再读取前端传入的 author 字段
    （原实现允许任意用户伪造他人身份发文）。
    """
    data = request.data.copy() if hasattr(request.data, 'copy') else request.data
    try:
        data.pop('author', None)
    except (AttributeError, TypeError):
        pass

    serializer = BlogSerializer(data=data, context={'request': request})
    if serializer.is_valid():
        blog = serializer.save(author=request.user)
        return Response(
            {
                'detail': '文章发布成功。',
                'blog': BlogSerializer(
                    blog, context={'request': request}).data,
            },
            status=status.HTTP_201_CREATED,
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def updateBlog(request, pk):
    """更新文章（仅作者本人）。"""
    blog = Blog.objects.filter(pk=pk).first()
    if blog is None:
        return Response({'detail': '文章不存在或已被删除。'},
                        status=status.HTTP_404_NOT_FOUND)

    if blog.author_id != request.user.pk:
        return Response({'detail': '您只能编辑自己发布的文章。'},
                        status=status.HTTP_403_FORBIDDEN)

    partial = request.method == 'PATCH'
    serializer = BlogSerializer(
        blog, data=request.data, partial=partial, context={'request': request})
    if serializer.is_valid():
        serializer.save()
        return Response({
            'detail': '文章已保存。',
            'blog': serializer.data,
        })
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def deleteBlog(request, pk):
    """删除文章（仅作者本人）。"""
    blog = Blog.objects.filter(pk=pk).first()
    if blog is None:
        return Response({'detail': '文章不存在或已被删除。'},
                        status=status.HTTP_404_NOT_FOUND)

    if blog.author_id != request.user.pk and not request.user.is_staff:
        return Response({'detail': '您只能删除自己发布的文章。'},
                        status=status.HTTP_403_FORBIDDEN)

    blog.delete()
    return Response({'detail': '文章已删除。'}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggleLike(request, pk):
    """点赞 / 取消点赞（同一接口切换，幂等安全）。"""
    blog = Blog.objects.filter(pk=pk).first()
    if blog is None:
        return Response({'detail': '文章不存在或已被删除。'},
                        status=status.HTTP_404_NOT_FOUND)

    user = request.user
    if blog.likes.filter(pk=user.pk).exists():
        blog.likes.remove(user)
        liked = False
        message = '已取消点赞'
    else:
        blog.likes.add(user)
        liked = True
        message = '点赞成功'

    return Response({
        'detail': message,
        'liked': liked,
        'total_likes': blog.likes.count(),
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggleFavorite(request, pk):
    """收藏 / 取消收藏（同一接口切换）。"""
    blog = Blog.objects.filter(pk=pk).first()
    if blog is None:
        return Response({'detail': '文章不存在或已被删除。'},
                        status=status.HTTP_404_NOT_FOUND)

    favorite = Favorite.objects.filter(user=request.user, blog=blog).first()
    if favorite:
        favorite.delete()
        favorited = False
        message = '已取消收藏'
    else:
        Favorite.objects.create(user=request.user, blog=blog)
        favorited = True
        message = '已加入收藏夹'

    return Response({
        'detail': message,
        'favorited': favorited,
        'favorite_count': blog.favorited_by.count(),
    })


# ==================================================================
# 收藏夹
# ==================================================================
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def getFavorites(request):
    """我的收藏列表。"""
    queryset = (
        Favorite.objects
        .filter(user=request.user)
        .select_related('blog', 'blog__author')
        .prefetch_related('blog__tags', 'blog__likes',
                          'blog__favorited_by', 'blog__comments')
    )

    search = request.GET.get('search')
    if search:
        queryset = queryset.filter(
            Q(blog__title__icontains=search) |
            Q(blog__content__icontains=search))

    category = request.GET.get('category')
    if category:
        queryset = queryset.filter(blog__category=category)

    return paginate(request, queryset, FavoriteSerializer)


# ==================================================================
# 标签
# ==================================================================
@api_view(['GET'])
@permission_classes([AllowAny])
def getTags(request):
    """
    标签列表，供标签云使用。

    返回每个标签的已发布文章数，并按热度倒序排列。
    """
    tags = (
        Tag.objects
        .annotate(
            count=Count('blogs', filter=Q(blogs__publish_status=True), distinct=True))
        .order_by('-count', 'name')
    )

    data = [
        {
            'id': tag.id,
            'name': tag.name,
            'slug': tag.slug,
            'count': tag.count,
        }
        for tag in tags
    ]
    return Response({
        'count': len(data),
        'results': data,
        'max_count': max([t['count'] for t in data], default=0),
    })


# ==================================================================
# 评论
# ==================================================================
@api_view(['GET'])
@permission_classes([AllowAny])
def getComments(request, pk):
    """某篇文章的评论列表。"""
    comments = (
        Comment.objects
        .filter(blog_id=pk)
        .select_related('user')
        .order_by('-date')
    )
    serializer = CommentSerializer(
        comments, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def createComment(request):
    """发表评论。user 取自登录态，前端无需也不应传入。"""
    data = request.data.copy() if hasattr(request.data, 'copy') else request.data
    try:
        data.pop('user', None)
    except (AttributeError, TypeError):
        pass

    serializer = CommentCreateSerializer(data=data)
    if serializer.is_valid():
        comment = serializer.save(user=request.user)
        return Response(
            {
                'detail': '评论发表成功。',
                'comment': CommentSerializer(
                    comment, context={'request': request}).data,
            },
            status=status.HTTP_201_CREATED,
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def deleteComment(request, pk):
    """删除评论（仅评论作者本人，管理员亦可）。"""
    comment = Comment.objects.filter(pk=pk).select_related('user').first()
    if comment is None:
        return Response({'detail': '该评论不存在或已被删除。'},
                        status=status.HTTP_404_NOT_FOUND)

    if comment.user_id != request.user.pk and not request.user.is_staff:
        return Response({'detail': '您只能删除自己的评论。'},
                        status=status.HTTP_403_FORBIDDEN)

    comment.delete()
    return Response({'detail': '评论已删除。'}, status=status.HTTP_200_OK)


# ==================================================================
# 站点统计（首页 / 侧边栏用）
# ==================================================================
@api_view(['GET'])
@permission_classes([AllowAny])
def getSiteStats(request):
    """站点概览数据（首页统计条 / 侧边栏）。"""
    published = Blog.objects.filter(publish_status=True)
    aggregates = published.aggregate(
        total_views=Sum('views'),
        blog_count=Count('id', distinct=True),
    )
    return Response({
        'blog_count': aggregates['blog_count'] or 0,
        'author_count': Profile.objects.filter(
            blogs__publish_status=True).distinct().count(),
        'tag_count': Tag.objects.count(),
        'comment_count': Comment.objects.count(),
        'total_views': aggregates['total_views'] or 0,
        'category_count': len(Blog.CATEGORY_CHOICES),
        'site_name': settings.SITE_NAME,
        'site_slogan': settings.SITE_SLOGAN,
    })
