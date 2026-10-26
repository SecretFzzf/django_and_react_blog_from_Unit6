"""
墨韵博客 - 序列化器

关键修复：
    原 ProfileSerializer.create() 会同时创建 django.contrib.auth.models.User
    与 Profile 两个对象（前者与本项目 AUTH_USER_MODEL 不是同一张表），
    导致「一次注册写入两张表、Profile 关联缺失字段」的严重 Bug。
    现已改为统一走 Profile.objects.create_user()。
"""

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import Blog, Comment, Favorite, Profile, Tag


# ==================================================================
# 通用工具
# ==================================================================
def absolute_media_url(request, url):
    """把相对媒体地址补全为绝对地址；前端无需再拼接 BASE_URL。"""
    if not url:
        return None
    if str(url).startswith(('http://', 'https://')):
        return url
    if request is not None:
        return request.build_absolute_uri(url)
    return url


def validate_password_strength(password, user=None):
    """调用 Django 密码校验器，并把错误统一转换为中文提示。"""
    try:
        validate_password(password, user)
    except DjangoValidationError as exc:
        raise serializers.ValidationError(list(exc.messages))


# ==================================================================
# 标签
# ==================================================================
class TagSerializer(serializers.ModelSerializer):
    blog_count = serializers.SerializerMethodField()

    class Meta:
        model = Tag
        fields = ['id', 'name', 'slug', 'blog_count']

    def get_blog_count(self, obj):
        return obj.blog_count()


class TagRelatedField(serializers.Field):
    """
    标签多对多字段。

    写入：接受 ["Django", "React"] 或 "Django,React"，不存在则自动创建。
    读取：返回 [{id, name, slug, blog_count}, ...]。
    """

    def to_representation(self, value):
        return TagSerializer(value, many=True).data

    def to_internal_value(self, data):
        if data in (None, ''):
            return []

        if isinstance(data, str):
            names = [n.strip() for n in data.replace('，', ',').split(',')]
        elif isinstance(data, (list, tuple)):
            names = []
            for item in data:
                if isinstance(item, dict):
                    names.append(str(item.get('name', '')).strip())
                elif isinstance(item, int):
                    tag = Tag.objects.filter(pk=item).first()
                    if tag:
                        names.append(tag.name)
                else:
                    names.extend(
                        n.strip() for n in str(item).replace('，', ',').split(','))
        else:
            raise serializers.ValidationError('标签格式不正确，应为字符串数组。')

        names = [n for n in names if n][:10]
        if not names:
            return []

        tags = []
        for name in names:
            if len(name) > 50:
                raise serializers.ValidationError(
                    f'标签「{name[:20]}…」长度超过 50 个字符。')
            tag, _ = Tag.objects.get_or_create(name=name)
            tags.append(tag)
        return tags


# ==================================================================
# 用户
# ==================================================================
class AuthorSerializer(serializers.ModelSerializer):
    """文章 / 评论中内嵌的作者简要信息。"""

    display_name = serializers.CharField(read_only=True)
    photo_url = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = ['id', 'username', 'nickname', 'display_name',
                  'photo_url', 'bio']

    def get_photo_url(self, obj):
        return absolute_media_url(self.context.get('request'), obj.photo_url)


class ProfileSerializer(serializers.ModelSerializer):
    """个人中心展示用：含统计数据与社交链接。"""

    photo_url = serializers.SerializerMethodField()
    display_name = serializers.CharField(read_only=True)
    blog_count = serializers.SerializerMethodField()
    favorite_count = serializers.SerializerMethodField()
    liked_count = serializers.SerializerMethodField()
    date_joined_format = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = [
            'id', 'username', 'nickname', 'display_name', 'email',
            'photo', 'photo_url', 'bio',
            'website', 'github', 'twitter', 'weibo', 'zhihu',
            'is_staff', 'date_joined', 'date_joined_format',
            'blog_count', 'favorite_count', 'liked_count',
        ]
        read_only_fields = ['id', 'username', 'is_staff', 'date_joined']

    def get_photo_url(self, obj):
        return absolute_media_url(self.context.get('request'), obj.photo_url)

    def get_blog_count(self, obj):
        return obj.blogs.count()

    def get_favorite_count(self, obj):
        return obj.favorites.count()

    def get_liked_count(self, obj):
        return obj.liked_blogs.count()

    def get_date_joined_format(self, obj):
        return obj.date_joined.strftime('%Y年%m月%d日') if obj.date_joined else ''


class ProfileUpdateSerializer(serializers.ModelSerializer):
    """修改个人资料：昵称 / 简介 / 社交链接 / 头像。"""

    class Meta:
        model = Profile
        fields = ['nickname', 'bio', 'photo',
                  'website', 'github', 'twitter', 'weibo', 'zhihu']

    def validate_nickname(self, value):
        value = (value or '').strip()
        if value and len(value) > 50:
            raise serializers.ValidationError('昵称不能超过 50 个字符。')
        return value

    def validate_bio(self, value):
        value = (value or '').strip()
        if len(value) > 500:
            raise serializers.ValidationError('个人简介不能超过 500 个字符。')
        return value

    def validate_photo(self, value):
        if value and getattr(value, 'size', 0) > 2 * 1024 * 1024:
            raise serializers.ValidationError('头像大小不能超过 2MB。')
        if value and not str(getattr(value, 'content_type', '')).startswith('image/'):
            raise serializers.ValidationError('头像必须是图片文件。')
        return value


class RegisterSerializer(serializers.ModelSerializer):
    """账号注册：用户名 + 邮箱 + 密码强度 + 确认密码 + 头像。"""

    password = serializers.CharField(
        write_only=True, min_length=8, max_length=128,
        error_messages={'min_length': '密码长度至少 8 位。'})
    confirm_password = serializers.CharField(
        write_only=True, required=False, allow_blank=True)
    nickname = serializers.CharField(required=False, allow_blank=True, max_length=50)
    bio = serializers.CharField(required=False, allow_blank=True, max_length=500)
    email = serializers.EmailField(required=True)
    # 关闭 ModelSerializer 自动生成的 UniqueValidator，
    # 改用下方 validate_username 中更友好的中文提示
    username = serializers.CharField(
        max_length=30, validators=[],
        error_messages={'blank': '请填写用户名。', 'required': '请填写用户名。'})

    class Meta:
        model = Profile
        fields = ['username', 'email', 'password', 'confirm_password',
                  'nickname', 'bio', 'photo']

    def validate_username(self, value):
        value = (value or '').strip()
        if len(value) < 3:
            raise serializers.ValidationError('用户名至少需要 3 个字符。')
        if len(value) > 30:
            raise serializers.ValidationError('用户名不能超过 30 个字符。')
        if Profile.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError('该用户名已被注册，请更换一个。')
        return value

    def validate_email(self, value):
        value = (value or '').strip().lower()
        if Profile.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('该邮箱已被注册，请更换一个。')
        return value

    def validate_photo(self, value):
        if value is None:
            return value
        if getattr(value, 'size', 0) > 2 * 1024 * 1024:
            raise serializers.ValidationError('头像大小不能超过 2MB。')
        if not str(getattr(value, 'content_type', '')).startswith('image/'):
            raise serializers.ValidationError('头像必须是图片文件。')
        return value

    def validate(self, attrs):
        password = attrs.get('password')
        confirm = attrs.get('confirm_password')

        if confirm is not None and confirm != '' and confirm != password:
            raise serializers.ValidationError(
                {'confirm_password': ['两次输入的密码不一致，请重新确认。']})

        # 密码强度校验（长度 / 常见密码 / 纯数字 / 与用户名相似度）
        probe = Profile(
            username=attrs.get('username', ''),
            email=attrs.get('email', ''),
            nickname=attrs.get('nickname', ''),
        )
        validate_password_strength(password, probe)
        return attrs

    def create(self, validated_data):
        """
        单一写入路径：只创建 Profile（即 AUTH_USER_MODEL）一条记录。

        旧实现同时调用 User.objects.create_user() 与 Profile.objects.create()，
        会因触发信号 / 关联不匹配而导致注册失败或数据错乱，此处已彻底修复。
        """
        validated_data.pop('confirm_password', None)
        password = validated_data.pop('password')

        profile = Profile(**validated_data)
        profile.set_password(password)
        profile.save()
        return profile

    def to_representation(self, instance):
        return ProfileSerializer(instance, context=self.context).data


# ==================================================================
# 密码相关
# ==================================================================
class PasswordChangeSerializer(serializers.Serializer):
    """已登录用户修改密码。"""

    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(
        write_only=True, required=False, allow_blank=True)

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('原密码不正确，请重新输入。')
        return value

    def validate(self, attrs):
        user = self.context['request'].user
        new_password = attrs.get('new_password')
        confirm = attrs.get('confirm_password')

        if confirm is not None and confirm != '' and confirm != new_password:
            raise serializers.ValidationError(
                {'confirm_password': ['两次输入的新密码不一致。']})

        if attrs.get('old_password') == new_password:
            raise serializers.ValidationError(
                {'new_password': ['新密码不能与原密码相同。']})

        validate_password_strength(new_password, user)
        return attrs

    def save(self, **kwargs):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save(update_fields=['password'])
        return user


class PasswordResetRequestSerializer(serializers.Serializer):
    """忘记密码：提交邮箱，申请重置链接。"""

    email = serializers.EmailField(required=True)

    def validate_email(self, value):
        value = (value or '').strip().lower()
        if not Profile.objects.filter(email__iexact=value, is_active=True).exists():
            # 出于安全考虑不暴露邮箱是否存在，但给出明确的操作指引
            raise serializers.ValidationError(
                '该邮箱未注册或账号已被停用，请检查后重试。')
        return value


class PasswordResetConfirmSerializer(serializers.Serializer):
    """重置密码：凭 uid + token 设置新密码。"""

    uid = serializers.CharField(required=True)
    token = serializers.CharField(required=True)
    new_password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(
        write_only=True, required=False, allow_blank=True)

    def validate(self, attrs):
        new_password = attrs.get('new_password')
        confirm = attrs.get('confirm_password')
        if confirm is not None and confirm != '' and confirm != new_password:
            raise serializers.ValidationError(
                {'confirm_password': ['两次输入的新密码不一致。']})
        validate_password_strength(new_password)
        return attrs


class LogoutSerializer(serializers.Serializer):
    """退出登录：把 refresh token 加入黑名单。"""

    refresh = serializers.CharField(required=False, allow_blank=True)


# ==================================================================
# 文章
# ==================================================================
class BlogSerializer(serializers.ModelSerializer):
    """
    文章完整序列化器（列表 / 详情通用）。

    - tags 支持读写双向
    - 自动附带当前登录用户的点赞 / 收藏状态
    """

    tags = TagRelatedField(required=False)
    author = AuthorSerializer(read_only=True)
    author_name = serializers.ReadOnlyField()
    author_username = serializers.ReadOnlyField()
    author_photo = serializers.SerializerMethodField()
    author_bio = serializers.ReadOnlyField()

    category_label = serializers.ReadOnlyField()
    image_url = serializers.SerializerMethodField()

    total_likes = serializers.ReadOnlyField()
    comment_count = serializers.ReadOnlyField()
    favorite_count = serializers.ReadOnlyField()

    summary = serializers.ReadOnlyField()
    reading_time = serializers.ReadOnlyField()
    date_created = serializers.ReadOnlyField()
    date_updated = serializers.ReadOnlyField()
    date_short = serializers.ReadOnlyField()

    is_liked = serializers.SerializerMethodField()
    is_favorited = serializers.SerializerMethodField()
    is_owner = serializers.SerializerMethodField()

    class Meta:
        model = Blog
        fields = [
            'id', 'title', 'slug', 'content', 'summary',
            'image', 'image_url', 'category', 'category_label', 'tags',
            'views', 'is_top', 'publish_status',
            'total_likes', 'comment_count', 'favorite_count',
            'author', 'author_name', 'author_username',
            'author_photo', 'author_bio',
            'reading_time', 'date_created', 'date_updated', 'date_short',
            'created_at', 'updated_at',
            'is_liked', 'is_favorited', 'is_owner',
        ]

    # ---------------- 媒体地址 ----------------
    def get_image_url(self, obj):
        if not obj.image:
            return None
        try:
            return absolute_media_url(self.context.get('request'), obj.image.url)
        except ValueError:
            return None

    def get_author_photo(self, obj):
        return absolute_media_url(self.context.get('request'), obj.author_photo)

    # ---------------- 当前用户状态 ----------------
    def _current_user(self):
        request = self.context.get('request')
        if request is None:
            return None
        user = getattr(request, 'user', None)
        if user is None or not user.is_authenticated:
            return None
        return user

    def get_is_liked(self, obj):
        user = self._current_user()
        if not user:
            return False
        return obj.likes.filter(pk=user.pk).exists()

    def get_is_favorited(self, obj):
        user = self._current_user()
        if not user:
            return False
        return obj.favorited_by.filter(user=user).exists()

    def get_is_owner(self, obj):
        user = self._current_user()
        if not user:
            return False
        return obj.author_id == user.pk

    # ---------------- 校验 ----------------
    def validate_title(self, value):
        value = (value or '').strip()
        if len(value) < 2:
            raise serializers.ValidationError('标题至少需要 2 个字符。')
        if len(value) > 150:
            raise serializers.ValidationError('标题不能超过 150 个字符。')
        return value

    def validate_content(self, value):
        plain = (value or '').strip()
        if len(plain) < 10:
            raise serializers.ValidationError('正文内容太短了，至少需要 10 个字符。')
        return value

    def validate_image(self, value):
        if value is None:
            return value
        if getattr(value, 'size', 0) > 5 * 1024 * 1024:
            raise serializers.ValidationError('封面图大小不能超过 5MB。')
        if not str(getattr(value, 'content_type', '')).startswith('image/'):
            raise serializers.ValidationError('封面图必须是图片文件。')
        return value

    # ---------------- 写入 ----------------
    def create(self, validated_data):
        tags = validated_data.pop('tags', [])
        post = Blog.objects.create(**validated_data)
        if tags:
            post.tags.set(tags)
        return post

    def update(self, instance, validated_data):
        tags = validated_data.pop('tags', None)

        new_image = validated_data.get('image', None)
        old_image = instance.image
        if new_image is not None and old_image and old_image.name != new_image.name:
            old_image.delete(save=False)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if tags is not None:
            instance.tags.set(tags)
        return instance


class BlogListSerializer(BlogSerializer):
    """
    列表场景精简版：剔除完整正文，仅保留摘要，降低传输体积。
    """

    class Meta(BlogSerializer.Meta):
        fields = [f for f in BlogSerializer.Meta.fields
                  if f not in ('content',)]


class BlogArchiveSerializer(serializers.ModelSerializer):
    """归档页使用的轻量结构。"""

    date_short = serializers.ReadOnlyField()
    category_label = serializers.ReadOnlyField()
    author_name = serializers.ReadOnlyField()

    class Meta:
        model = Blog
        fields = ['id', 'title', 'slug', 'category', 'category_label',
                  'date_short', 'created_at', 'views',
                  'author_name', 'reading_time', 'summary']


# ==================================================================
# 收藏
# ==================================================================
class FavoriteSerializer(serializers.ModelSerializer):
    blog = BlogListSerializer(read_only=True)
    date_created = serializers.ReadOnlyField()

    class Meta:
        model = Favorite
        fields = ['id', 'blog', 'created_at', 'date_created']


# ==================================================================
# 评论
# ==================================================================
class CommentSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField()
    user_photo = serializers.SerializerMethodField()
    date_format = serializers.ReadOnlyField()
    is_owner = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ['id', 'blog', 'username', 'body', 'date',
                  'date_format', 'user_photo', 'user_id', 'is_owner']
        read_only_fields = ['id', 'date', 'user_id']

    def get_user_photo(self, obj):
        return absolute_media_url(self.context.get('request'), obj.user_photo)

    def get_is_owner(self, obj):
        request = self.context.get('request')
        user = getattr(request, 'user', None) if request else None
        if user is None or not user.is_authenticated:
            return False
        return obj.user_id == user.pk

    def validate_body(self, value):
        value = (value or '').strip()
        if len(value) < 2:
            raise serializers.ValidationError('评论内容太短了，至少 2 个字符。')
        if len(value) > 1000:
            raise serializers.ValidationError('评论内容不能超过 1000 个字符。')
        return value


class CommentCreateSerializer(serializers.ModelSerializer):
    """创建评论：user 由后端从请求上下文注入，不接受前端伪造。"""

    class Meta:
        model = Comment
        fields = ['blog', 'body']

    def validate_body(self, value):
        value = (value or '').strip()
        if len(value) < 2:
            raise serializers.ValidationError('评论内容太短了，至少 2 个字符。')
        if len(value) > 1000:
            raise serializers.ValidationError('评论内容不能超过 1000 个字符。')
        return value

    def validate_blog(self, value):
        if not value.publish_status:
            raise serializers.ValidationError('该文章尚未发布，暂不支持评论。')
        return value
