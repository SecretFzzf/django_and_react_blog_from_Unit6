"""
墨韵博客 - 根路由

注意：Django 4.x 中 django.conf.urls.include 已被移除，
必须使用 django.urls.include。
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
]

# 开发环境提供媒体文件访问（生产环境请交给 Nginx 等静态服务器）
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

# 后台标题中文化
admin.site.site_header = f'{settings.SITE_NAME} · 管理后台'
admin.site.site_title = f'{settings.SITE_NAME} 管理后台'
admin.site.index_title = '站点数据管理'
