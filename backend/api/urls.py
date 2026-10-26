"""
墨韵博客 - 路由表

统一前缀：/api/
"""

from django.urls import path

from . import views
from .views import MyTokenObtainPairView, MyTokenRefreshView

urlpatterns = [
    # ---------------- 认证 ----------------
    path('token/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', MyTokenRefreshView.as_view(), name='token_refresh'),
    path('auth/logout/', views.logoutUser, name='logout'),

    # ---------------- 注册 / 密码 ----------------
    path('register/', views.registerUser, name='register'),
    path('auth/password/change/', views.changePassword, name='password-change'),
    path('auth/password/reset/', views.requestPasswordReset, name='password-reset'),
    path('auth/password/reset/confirm/', views.confirmPasswordReset,
         name='password-reset-confirm'),
    path('auth/password/reset/verify/', views.verifyResetToken,
         name='password-reset-verify'),

    # ---------------- 用户资料 ----------------
    path('profile/me/', views.getMyProfile, name='profile-me'),
    path('profile/update/', views.updateMyProfile, name='profile-update'),
    path('profile/<int:pk>/', views.getProfile, name='profile-detail'),

    # ---------------- 文章 ----------------
    path('blogs/', views.getBlogs, name='blogs'),
    path('blogs/create/', views.createBlog, name='create-blog'),
    path('blogs/my/', views.getMyBlogs, name='my-blogs'),
    path('blogs/hot/', views.getHotBlogs, name='hot-blogs'),
    path('blogs/archive/', views.getArchive, name='blog-archive'),
    path('blogs/categories/', views.getCategory, name='categories'),
    # 兼容旧前端命名
    path('blogs/category/', views.getCategory, name='category-legacy'),
    path('blogs/<int:pk>/', views.getBlog, name='blog'),
    path('blogs/<int:pk>/update/', views.updateBlog, name='update-blog'),
    path('blogs/<int:pk>/delete/', views.deleteBlog, name='delete-blog'),
    path('blogs/<int:pk>/like/', views.toggleLike, name='toggle-like'),
    path('blogs/<int:pk>/favorite/', views.toggleFavorite, name='toggle-favorite'),
    path('blogs/<int:pk>/comments/', views.getComments, name='comments'),

    # ---------------- 标签 ----------------
    path('tags/', views.getTags, name='tags'),

    # ---------------- 收藏夹 ----------------
    path('favorites/', views.getFavorites, name='favorites'),

    # ---------------- 评论 ----------------
    path('comments/create/', views.createComment, name='create-comment'),
    path('comments/<int:pk>/delete/', views.deleteComment, name='delete-comment'),

    # ---------------- 站点统计 ----------------
    path('stats/', views.getSiteStats, name='site-stats'),
]
