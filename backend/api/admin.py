"""
墨韵博客 - 管理后台

全部模型均已中文化，并补充了列表展示字段、筛选器与搜索项。
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.html import format_html

from .forms import ProfileChangeForm, ProfileCreationForm
from .models import Blog, Comment, Favorite, Profile, Tag


# ==================================================================
# 用户
# ==================================================================
ADDITIONAL_USER_FIELDS = [
    ('个人资料', {
        'fields': ('nickname', 'photo', 'bio', 'preview_avatar'),
    }),
    ('社交链接', {
        'fields': ('website', 'github', 'twitter', 'weibo', 'zhihu'),
        'classes': ('collapse',),
    }),
]


@admin.register(Profile)
class ProfileAdmin(UserAdmin):
    add_form = ProfileCreationForm
    form = ProfileChangeForm
    model = Profile

    list_display = ['id', 'username', 'nickname', 'email',
                    'blog_total', 'is_staff', 'is_active', 'date_joined']
    list_filter = ['is_staff', 'is_superuser', 'is_active', 'date_joined']
    search_fields = ['username', 'nickname', 'email']
    ordering = ['-date_joined']
    list_per_page = 20

    fieldsets = UserAdmin.fieldsets + tuple(ADDITIONAL_USER_FIELDS)
    add_fieldsets = UserAdmin.add_fieldsets + tuple(ADDITIONAL_USER_FIELDS)

    readonly_fields = ['preview_avatar']

    @admin.display(description='头像')
    def preview_avatar(self, obj):
        if obj.photo:
            return format_html(
                '<img src="{}" style="width:64px;height:64px;'
                'border-radius:50%;object-fit:cover;" />', obj.photo.url)
        return '未上传'

    @admin.display(description='发文数')
    def blog_total(self, obj):
        return obj.blogs.count()


# ==================================================================
# 文章
# ==================================================================
@admin.register(Blog)
class BlogAdmin(admin.ModelAdmin):
    list_display = ['id', 'title', 'author', 'category_label', 'tag_list',
                    'views', 'likes_total', 'comment_total',
                    'is_top', 'publish_status', 'created_at']
    list_display_links = ['id', 'title']
    list_filter = ['publish_status', 'is_top', 'category',
                   'tags', 'created_at', 'author']
    search_fields = ['title', 'content', 'author__username', 'author__nickname']
    list_editable = ['is_top', 'publish_status']
    list_per_page = 20
    date_hierarchy = 'created_at'
    autocomplete_fields = ['author']
    filter_horizontal = ['tags', 'likes']
    readonly_fields = ['views', 'created_at', 'updated_at', 'preview_cover']
    actions = ['make_published', 'make_draft', 'make_top', 'cancel_top']

    fieldsets = (
        ('基本信息', {
            'fields': ('title', 'slug', 'author', 'category', 'tags'),
        }),
        ('内容', {
            'fields': ('content', 'image', 'preview_cover'),
        }),
        ('发布设置', {
            'fields': ('publish_status', 'is_top', 'views',
                       'created_at', 'updated_at'),
        }),
    )

    @admin.display(description='分类', ordering='category')
    def category_label(self, obj):
        return obj.get_category_display()

    @admin.display(description='标签')
    def tag_list(self, obj):
        names = [tag.name for tag in obj.tags.all()[:4]]
        return '、'.join(names) if names else '—'

    @admin.display(description='点赞数')
    def likes_total(self, obj):
        return obj.likes.count()

    @admin.display(description='评论数')
    def comment_total(self, obj):
        return obj.comments.count()

    @admin.display(description='封面预览')
    def preview_cover(self, obj):
        if obj.image:
            return format_html(
                '<img src="{}" style="max-width:320px;border-radius:12px;" />',
                obj.image.url)
        return '未上传封面'

    # ---------------- 批量操作 ----------------
    @admin.action(description='批量设为「已发布」')
    def make_published(self, request, queryset):
        count = queryset.update(publish_status=True)
        self.message_user(request, f'已将 {count} 篇文章设为「已发布」。')

    @admin.action(description='批量设为「草稿」')
    def make_draft(self, request, queryset):
        count = queryset.update(publish_status=False)
        self.message_user(request, f'已将 {count} 篇文章设为「草稿」。')

    @admin.action(description='批量置顶')
    def make_top(self, request, queryset):
        count = queryset.update(is_top=True)
        self.message_user(request, f'已置顶 {count} 篇文章。')

    @admin.action(description='取消置顶')
    def cancel_top(self, request, queryset):
        count = queryset.update(is_top=False)
        self.message_user(request, f'已取消置顶 {count} 篇文章。')


# ==================================================================
# 标签
# ==================================================================
@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'slug', 'blog_total', 'created_at']
    search_fields = ['name', 'slug']
    prepopulated_fields = {}
    list_per_page = 30
    ordering = ['name']

    @admin.display(description='文章数')
    def blog_total(self, obj):
        return obj.blogs.count()


# ==================================================================
# 收藏
# ==================================================================
@admin.register(Favorite)
class FavoriteAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'blog_title', 'created_at']
    list_filter = ['created_at', 'user']
    search_fields = ['user__username', 'user__nickname', 'blog__title']
    autocomplete_fields = ['user', 'blog']
    list_per_page = 30
    date_hierarchy = 'created_at'

    @admin.display(description='文章', ordering='blog__title')
    def blog_title(self, obj):
        return obj.blog.title


# ==================================================================
# 评论
# ==================================================================
@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ['id', 'blog_title', 'user', 'short_body', 'date']
    list_filter = ['date']
    search_fields = ['body', 'user__username', 'user__nickname', 'blog__title']
    autocomplete_fields = ['user', 'blog']
    list_per_page = 30
    date_hierarchy = 'date'
    readonly_fields = ['date']

    @admin.display(description='评论内容')
    def short_body(self, obj):
        return obj.body[:60] + ('…' if len(obj.body) > 60 else '')

    @admin.display(description='所属文章', ordering='blog__title')
    def blog_title(self, obj):
        return obj.blog.title
