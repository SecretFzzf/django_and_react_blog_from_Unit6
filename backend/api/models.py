"""
墨韵博客 - 数据模型

模型清单：
    Profile   自定义用户（继承 AbstractUser，扩展昵称 / 头像 / 简介 / 社交链接）
    Tag       标签
    Blog      文章（含浏览量、置顶、多标签、中文分类）
    Favorite  收藏
    Comment   评论
"""

import math
import re
import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from django.utils.html import strip_tags
from django.utils.text import slugify


# ==================================================================
# 工具函数
# ==================================================================
def build_unique_slug(model, source, instance_pk=None, max_length=200):
    """
    生成唯一 slug。

    与 django-autoslug 不同，这里使用 allow_unicode=True，
    保证中文标题也能产出可读的 slug（如「django-入门指南」），
    并自动追加数字后缀解决重名。
    """
    base = slugify(source or '', allow_unicode=True).strip('-')[:max_length]
    if not base:
        base = f'{model.__name__.lower()}-{uuid.uuid4().hex[:8]}'

    queryset = model.objects.all()
    if instance_pk is not None:
        queryset = queryset.exclude(pk=instance_pk)

    slug = base
    index = 1
    while queryset.filter(slug=slug).exists():
        index += 1
        suffix = f'-{index}'
        slug = f'{base[:max_length - len(suffix)]}{suffix}'
    return slug


def html_to_text(html: str) -> str:
    """把富文本 HTML 转成纯文本，用于摘要与字数统计。"""
    if not html:
        return ''
    text = strip_tags(html)
    text = text.replace('&nbsp;', ' ').replace('&amp;', '&')
    text = text.replace('&lt;', '<').replace('&gt;', '>').replace('&quot;', '"')
    return re.sub(r'\s+', ' ', text).strip()


# ==================================================================
# 用户
# ==================================================================
class Profile(AbstractUser):
    """站点用户。继承 AbstractUser，复用 Django 完整的权限体系。"""

    nickname = models.CharField('昵称', max_length=50, blank=True, default='')
    photo = models.ImageField('头像', upload_to='profile/',
                              blank=True, null=True)
    bio = models.TextField('个人简介', blank=True, default='', max_length=500)

    website = models.URLField('个人网站', blank=True, default='', max_length=200)
    github = models.URLField('GitHub', blank=True, default='', max_length=200)
    twitter = models.URLField('X / Twitter', blank=True, default='', max_length=200)
    weibo = models.URLField('微博', blank=True, default='', max_length=200)
    zhihu = models.URLField('知乎', blank=True, default='', max_length=200)

    class Meta:
        verbose_name = '用户'
        verbose_name_plural = '用户'
        ordering = ['-date_joined']

    def __str__(self):
        return self.nickname or self.username

    @property
    def display_name(self):
        """展示名：优先昵称，其次用户名。"""
        return self.nickname or self.username

    @property
    def photo_url(self):
        """头像地址；未上传时返回 None，由前端渲染首字母占位头像。"""
        if self.photo:
            try:
                return self.photo.url
            except ValueError:
                return None
        return None

    def blog_count(self):
        return self.blogs.count()


# ==================================================================
# 标签
# ==================================================================
class Tag(models.Model):
    """文章标签，支持多对多关联。"""

    name = models.CharField('标签名', max_length=50, unique=True)
    slug = models.SlugField('标识', max_length=80, unique=True,
                            blank=True, allow_unicode=True)
    created_at = models.DateTimeField('创建时间', auto_now_add=True)

    class Meta:
        verbose_name = '标签'
        verbose_name_plural = '标签'
        ordering = ['name']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        self.name = (self.name or '').strip()
        if not self.slug:
            self.slug = build_unique_slug(
                Tag, self.name, instance_pk=self.pk, max_length=80)
        super().save(*args, **kwargs)

    def blog_count(self):
        return self.blogs.filter(publish_status=True).count()


# ==================================================================
# 文章
# ==================================================================
class Blog(models.Model):
    """博客文章。"""

    # ---------- 中文分类 ----------
    CATEGORY_CHOICES = (
        ('tech', '技术'),
        ('frontend', '前端'),
        ('backend', '后端'),
        ('algorithm', '算法'),
        ('ai', '人工智能'),
        ('database', '数据库'),
        ('devops', '运维部署'),
        ('mobile', '移动开发'),
        ('security', '网络安全'),
        ('product', '产品设计'),
        ('tools', '工具效率'),
        ('career', '职场成长'),
        ('life', '生活随笔'),
        ('reading', '读书笔记'),
        ('travel', '旅行见闻'),
        ('other', '其他'),
    )

    AUTHOR_RELATED_NAME = 'blogs'

    author = models.ForeignKey(
        Profile, verbose_name='作者', null=True, blank=True,
        on_delete=models.SET_NULL, related_name=AUTHOR_RELATED_NAME)

    title = models.CharField('标题', max_length=150)
    slug = models.SlugField('标识', max_length=220, unique=True,
                            blank=True, allow_unicode=True)

    content = models.TextField('正文')
    image = models.ImageField('封面图', upload_to='images/',
                              blank=True, null=True)

    category = models.CharField('分类', max_length=50, default='other',
                                choices=CATEGORY_CHOICES)
    tags = models.ManyToManyField(Tag, verbose_name='标签',
                                  related_name='blogs', blank=True)

    views = models.PositiveIntegerField('浏览量', default=0)
    is_top = models.BooleanField('置顶', default=False)

    publish_status = models.BooleanField('发布状态', default=True, choices=(
        (True, '已发布'),
        (False, '草稿'),
    ))

    likes = models.ManyToManyField(
        Profile, verbose_name='点赞', related_name='liked_blogs', blank=True)

    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        verbose_name = '文章'
        verbose_name_plural = '文章'
        # 置顶优先，其次按创建时间倒序
        ordering = ['-is_top', '-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['category']),
            models.Index(fields=['-views']),
        ]

    def __str__(self):
        return self.title

    # -------------------- 保存逻辑 --------------------
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = build_unique_slug(
                Blog, self.title, instance_pk=self.pk, max_length=220)
        super().save(*args, **kwargs)

    def get_absolute_url(self):
        return f'/blog/{self.pk}'

    # -------------------- 展示属性（空值安全）--------------------
    @property
    def author_name(self):
        if not self.author:
            return '已注销用户'
        return self.author.display_name

    @property
    def author_username(self):
        return self.author.username if self.author else ''

    @property
    def author_photo(self):
        return self.author.photo_url if self.author else None

    @property
    def author_bio(self):
        return (self.author.bio if self.author else '') or ''

    @property
    def category_label(self):
        return self.get_category_display()

    # -------------------- 统计 --------------------
    def total_likes(self):
        return self.likes.count()

    def comment_count(self):
        return self.comments.count()

    def favorite_count(self):
        return self.favorited_by.count()

    # -------------------- 文本处理 --------------------
    def plain_text(self):
        return html_to_text(self.content)

    def summary(self):
        """自动摘要：截取纯文本前 120 字。"""
        text = self.plain_text()
        if len(text) <= 120:
            return text
        return text[:120].rstrip() + '……'

    def word_count(self):
        """中文按字计数，英文按单词计数。"""
        text = self.plain_text()
        cjk = len(re.findall(r'[\u4e00-\u9fff]', text))
        latin = len(re.findall(r'[A-Za-z0-9]+', text))
        return cjk, latin

    def reading_time(self):
        """
        预估阅读时长。

        中文约 300 字/分钟，英文约 200 词/分钟。
        原文使用 len(content.split()) 统计，中文正文会恒为 0，
        这里按语种分别加权计算。
        """
        cjk, latin = self.word_count()
        minutes = cjk / 300 + latin / 200
        if minutes < 1:
            return '不到 1 分钟'
        return f'{math.ceil(minutes)} 分钟阅读'

    # -------------------- 时间格式化 --------------------
    def _local(self, dt):
        if not dt:
            return ''
        if timezone.is_aware(dt):
            dt = timezone.localtime(dt)
        return dt

    def date_created(self):
        dt = self._local(self.created_at)
        return dt.strftime('%Y年%m月%d日 %H:%M') if dt else ''

    def date_updated(self):
        dt = self._local(self.updated_at)
        return dt.strftime('%Y年%m月%d日 %H:%M') if dt else ''

    def date_short(self):
        dt = self._local(self.created_at)
        return dt.strftime('%Y-%m-%d') if dt else ''

    # -------------------- 删除时清理封面图 --------------------
    def delete(self, *args, **kwargs):
        image = self.image
        super().delete(*args, **kwargs)
        if image:
            image.delete(save=False)


# ==================================================================
# 收藏
# ==================================================================
class Favorite(models.Model):
    """用户收藏关系。"""

    user = models.ForeignKey(Profile, verbose_name='用户',
                             on_delete=models.CASCADE, related_name='favorites')
    blog = models.ForeignKey(Blog, verbose_name='文章',
                             on_delete=models.CASCADE, related_name='favorited_by')
    created_at = models.DateTimeField('收藏时间', auto_now_add=True)

    class Meta:
        verbose_name = '收藏'
        verbose_name_plural = '收藏'
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'blog'], name='unique_user_blog_favorite'),
        ]

    def __str__(self):
        return f'{self.user} 收藏了《{self.blog}》'

    def date_created(self):
        dt = self.created_at
        if dt and timezone.is_aware(dt):
            dt = timezone.localtime(dt)
        return dt.strftime('%Y年%m月%d日 %H:%M') if dt else ''


# ==================================================================
# 评论
# ==================================================================
class Comment(models.Model):
    """文章评论。"""

    blog = models.ForeignKey(Blog, verbose_name='文章',
                             on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(Profile, verbose_name='评论者',
                             on_delete=models.CASCADE, related_name='comments')
    body = models.TextField('评论内容', max_length=1000)
    date = models.DateTimeField('评论时间', auto_now_add=True)

    class Meta:
        verbose_name = '评论'
        verbose_name_plural = '评论'
        ordering = ['-date']

    def __str__(self):
        return f'{self.user} 的评论：{self.body[:20]}'

    @property
    def username(self):
        return self.user.display_name

    @property
    def user_photo(self):
        return self.user.photo_url

    @property
    def user_id_value(self):
        return self.user_id

    def date_format(self):
        dt = self.date
        if dt and timezone.is_aware(dt):
            dt = timezone.localtime(dt)
        if not dt:
            return ''
        # 一天内显示「x 小时前」，更符合现代博客习惯
        delta = timezone.now() - self.date
        seconds = delta.total_seconds()
        if seconds < 60:
            return '刚刚'
        if seconds < 3600:
            return f'{int(seconds // 60)} 分钟前'
        if seconds < 86400:
            return f'{int(seconds // 3600)} 小时前'
        if seconds < 86400 * 7:
            return f'{int(seconds // 86400)} 天前'
        return dt.strftime('%Y年%m月%d日 %H:%M')
