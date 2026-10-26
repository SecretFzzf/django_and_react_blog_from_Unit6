"""
墨韵博客 · 后端接口端到端冒烟测试

覆盖：注册 / 登录 / 令牌刷新 / 发帖 / 列表筛选 / 详情浏览量 /
      点赞 / 收藏 / 评论 / 归档 / 标签 / 热门 / 改密码 / 令牌重置 /
      资料修改 / 权限校验 / 异常中文化

使用方法（在 backend 目录下）：
    python smoke_test.py
"""

import json
import os
import sys

import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'blog.settings')
django.setup()

from django.test import Client  # noqa: E402
from django.contrib.auth import get_user_model  # noqa: E402

from api.models import Blog, Comment, Favorite, Profile, Tag  # noqa: E402

PASS, FAIL = [], []


def check(name, condition, extra=''):
    if condition:
        PASS.append(name)
        print(f'  [通过] {name}')
    else:
        FAIL.append(f'{name} {extra}')
        print(f'  [失败] {name} {extra}')


def body(response):
    try:
        return json.loads(response.content.decode('utf-8'))
    except Exception:
        return {}


def main():
    # ---------- 清理上轮残留 ----------
    Profile.objects.filter(username__in=['smoke_alice', 'smoke_bob']).delete()
    Tag.objects.filter(name__startswith='冒烟').delete()

    client = Client()

    print('\n=== 1. 账号注册 ===')
    r = client.post('/api/register/', {
        'username': 'smoke_alice',
        'email': 'smoke_alice@example.com',
        'password': 'MoYun#2026Aa',
        'confirm_password': 'MoYun#2026Aa',
        'nickname': '阿丽丝',
        'bio': '热爱写作的全栈工程师',
    }, content_type='application/json')
    data = body(r)
    check('注册成功返回 201', r.status_code == 201, f'-> {r.status_code} {data}')
    check('注册仅创建一条用户记录',
          Profile.objects.filter(username='smoke_alice').count() == 1)
    check('返回中文提示', '注册成功' in str(data.get('detail', '')))

    alice = Profile.objects.get(username='smoke_alice')

    print('\n=== 2. 注册校验 ===')
    r = client.post('/api/register/', {
        'username': 'smoke_alice',
        'email': 'other@example.com',
        'password': 'MoYun#2026Aa',
        'confirm_password': 'MoYun#2026Aa',
    }, content_type='application/json')
    check('重复用户名被拒绝', r.status_code == 400, f'-> {r.status_code}')
    check('用户名重复提示为中文', '已被注册' in str(body(r)), f'-> {body(r)}')

    r = client.post('/api/register/', {
        'username': 'smoke_bob',
        'email': 'smoke_bob@example.com',
        'password': 'MoYun#2026Aa',
        'confirm_password': 'DifferentPwd1!',
    }, content_type='application/json')
    check('两次密码不一致被拒绝', r.status_code == 400, f'-> {r.status_code}')

    r = client.post('/api/register/', {
        'username': 'smoke_carol',
        'email': 'smoke_carol@example.com',
        'password': '123',
        'confirm_password': '123',
    }, content_type='application/json')
    check('弱密码被拒绝', r.status_code == 400, f'-> {r.status_code}')

    print('\n=== 3. 登录与令牌 ===')
    r = client.post('/api/token/', {
        'username': 'smoke_alice',
        'password': 'MoYun#2026Aa',
    }, content_type='application/json')
    tokens = body(r)
    check('登录返回 200', r.status_code == 200, f'-> {r.status_code} {tokens}')
    check('返回 access + refresh',
          'access' in tokens and 'refresh' in tokens)
    check('登录响应附带用户资料', 'user' in tokens)
    access = tokens.get('access')
    refresh = tokens.get('refresh')
    auth = {'HTTP_AUTHORIZATION': f'Bearer {access}'}

    r = client.post('/api/token/', {
        'username': 'smoke_alice',
        'password': 'wrong-password',
    }, content_type='application/json')
    check('错误密码登录失败', r.status_code == 401, f'-> {r.status_code}')
    check('登录失败提示为中文',
          '用户名或密码错误' in str(body(r)), f'-> {body(r)}')

    r = client.post('/api/token/refresh/', {'refresh': refresh},
                    content_type='application/json')
    refreshed = body(r)
    check('刷新令牌成功', r.status_code == 200, f'-> {r.status_code}')
    check('轮换后返回新的 refresh', 'refresh' in refreshed)
    access = refreshed.get('access', access)
    refresh = refreshed.get('refresh', refresh)
    auth = {'HTTP_AUTHORIZATION': f'Bearer {access}'}

    print('\n=== 4. 分类接口中文化 ===')
    r = client.get('/api/blogs/categories/')
    cats = body(r)
    labels = [c['label'] for c in cats]
    check('分类接口返回 200', r.status_code == 200)
    check('包含中文分类「人工智能」', '人工智能' in labels, f'-> {labels}')
    check('包含中文分类「生活随笔」', '生活随笔' in labels)
    check('分类带文章计数', all('count' in c for c in cats))

    print('\n=== 5. 发布文章 ===')
    r = client.post('/api/blogs/create/', {
        'title': 'Django 与 React 前后端分离实践',
        'content': '## 背景\n\n这是一篇用于冒烟测试的长文。' * 8,
        'category': 'backend',
        'tags': ['冒烟Django', '冒烟React'],
        'publish_status': True,
    }, content_type='application/json', **auth)
    created = body(r)
    check('发布文章返回 201', r.status_code == 201, f'-> {r.status_code} {created}')
    blog_id = created.get('blog', {}).get('id')
    check('返回文章 id', blog_id is not None)
    check('标签自动创建', Tag.objects.filter(name='冒烟Django').exists())
    check('slug 自动生成',
          bool(Blog.objects.get(pk=blog_id).slug) if blog_id else False)
    check('分类中文名正确',
          created.get('blog', {}).get('category_label') == '后端',
          f"-> {created.get('blog', {}).get('category_label')}")
    check('阅读时长按中文计算',
          '分钟' in str(created.get('blog', {}).get('reading_time', '')),
          f"-> {created.get('blog', {}).get('reading_time')}")
    check('中文日期格式化',
          '年' in str(created.get('blog', {}).get('date_created', '')),
          f"-> {created.get('blog', {}).get('date_created')}")

    r = client.post('/api/blogs/create/', {
        'title': '第二条测试文章',
        'content': '用于验证分页与归档功能的正文内容。' * 5,
        'category': 'frontend',
        'tags': ['冒烟React'],
    }, content_type='application/json', **auth)
    check('发布第二篇文章', r.status_code == 201, f'-> {r.status_code}')
    blog2_id = body(r).get('blog', {}).get('id')

    print('\n=== 6. 列表 / 筛选 / 搜索 / 分页 ===')
    r = client.get('/api/blogs/')
    listing = body(r)
    check('列表返回 200', r.status_code == 200)
    check('分页结构完整',
          all(k in listing for k in ('count', 'results', 'total_pages')),
          f'-> {list(listing.keys())}')

    r = client.get('/api/blogs/?category=backend')
    check('按分类筛选生效',
          all(item['category'] == 'backend' for item in body(r)['results']))

    r = client.get('/api/blogs/?tag=冒烟Django')
    check('按标签筛选生效', body(r)['count'] >= 1, f"-> {body(r)['count']}")

    r = client.get('/api/blogs/?search=前后端分离')
    check('关键词搜索生效', body(r)['count'] >= 1, f"-> {body(r)['count']}")

    r = client.get('/api/blogs/?ordering=popular')
    check('按热度排序可用', r.status_code == 200)

    r = client.get('/api/blogs/?page=1&page_size=1')
    check('自定义每页条数生效', body(r).get('page_size') == 1,
          f"-> {body(r).get('page_size')}")

    print('\n=== 7. 详情与浏览量 ===')
    before = Blog.objects.get(pk=blog_id).views
    r = client.get(f'/api/blogs/{blog_id}/')
    detail = body(r)
    check('详情返回 200', r.status_code == 200)
    Blog.objects.get(pk=blog_id).refresh_from_db()
    after = Blog.objects.get(pk=blog_id).views
    check('匿名访问累加浏览量', after == before + 1, f'-> {before} => {after}')

    before = Blog.objects.get(pk=blog_id).views
    client.get(f'/api/blogs/{blog_id}/', **auth)
    check('作者本人访问不计浏览量',
          Blog.objects.get(pk=blog_id).views == before)

    r = client.get('/api/blogs/999999/')
    check('不存在的文章返回 404', r.status_code == 404, f'-> {r.status_code}')
    check('404 提示为中文', '不存在' in str(body(r)), f'-> {body(r)}')

    print('\n=== 8. 点赞 ===')
    r = client.post(f'/api/blogs/{blog_id}/like/', **auth)
    check('点赞成功', body(r).get('liked') is True, f'-> {body(r)}')
    check('点赞数 +1', body(r).get('total_likes') == 1)
    r = client.post(f'/api/blogs/{blog_id}/like/', **auth)
    check('再次点击取消点赞', body(r).get('liked') is False, f'-> {body(r)}')
    r = client.post(f'/api/blogs/{blog_id}/like/', **auth)
    client.post(f'/api/blogs/{blog_id}/like/', **auth)
    r = client.get(f'/api/blogs/{blog_id}/', **auth)
    check('详情返回当前用户点赞状态', body(r).get('is_liked') is False)

    r = client.post(f'/api/blogs/{blog_id}/like/')
    check('未登录点赞被拒绝', r.status_code == 401, f'-> {r.status_code}')

    print('\n=== 9. 收藏 ===')
    r = client.post(f'/api/blogs/{blog_id}/favorite/', **auth)
    check('收藏成功', body(r).get('favorited') is True, f'-> {body(r)}')
    check('收藏计数 +1', body(r).get('favorite_count') == 1)
    check('数据库写入收藏记录',
          Favorite.objects.filter(user=alice, blog_id=blog_id).exists())

    r = client.get('/api/favorites/', **auth)
    fav = body(r)
    check('收藏夹列表可用', fav.get('count') == 1, f'-> {fav.get("count")}')
    check('收藏夹内嵌文章卡片数据',
          bool(fav.get('results', [{}])[0].get('blog', {}).get('title')))

    r = client.get(f'/api/blogs/{blog_id}/', **auth)
    check('详情返回收藏状态', body(r).get('is_favorited') is True)

    r = client.post(f'/api/blogs/{blog_id}/favorite/', **auth)
    check('取消收藏成功', body(r).get('favorited') is False)
    client.post(f'/api/blogs/{blog_id}/favorite/', **auth)

    print('\n=== 10. 评论 ===')
    r = client.post('/api/comments/create/', {
        'blog': blog_id,
        'body': '这篇文章写得很清晰，感谢分享！',
    }, content_type='application/json', **auth)
    cmt = body(r)
    check('发表评论成功', r.status_code == 201, f'-> {r.status_code} {cmt}')
    comment_id = cmt.get('comment', {}).get('id')
    check('评论返回嵌套用户信息',
          cmt.get('comment', {}).get('username') == '阿丽丝',
          f"-> {cmt.get('comment', {}).get('username')}")
    check('评论时间人性化',
          '前' in str(cmt.get('comment', {}).get('date_format')) or
          '刚刚' in str(cmt.get('comment', {}).get('date_format')),
          f"-> {cmt.get('comment', {}).get('date_format')}")
    check('评论者由后端注入，前端无法伪造',
          Comment.objects.get(pk=comment_id).user_id == alice.id)

    r = client.get(f'/api/blogs/{blog_id}/comments/')
    check('评论列表可用', len(body(r)) == 1)

    r = client.get(f'/api/blogs/{blog_id}/')
    check('文章详情带评论数', body(r).get('comment_count') == 1)

    # 越权删除：bob 删 alice 的评论
    Profile.objects.create_user(
        username='smoke_bob', email='smoke_bob@example.com',
        password='MoYun#2026Aa')
    r = client.post('/api/token/', {'username': 'smoke_bob',
                                    'password': 'MoYun#2026Aa'},
                    content_type='application/json')
    bob_access = body(r)['access']
    bob_auth = {'HTTP_AUTHORIZATION': f'Bearer {bob_access}'}

    r = client.delete(f'/api/comments/{comment_id}/delete/', **bob_auth)
    check('越权删除他人评论被拒绝 (403)', r.status_code == 403, f'-> {r.status_code}')
    check('403 提示为中文', '只能删除自己的评论' in str(body(r)), f'-> {body(r)}')

    r = client.delete(f'/api/comments/{comment_id}/delete/', **auth)
    check('作者删除自己的评论成功', r.status_code == 200, f'-> {r.status_code}')

    r = client.post('/api/comments/create/', {
        'blog': blog_id, 'body': 'x',
    }, content_type='application/json', **auth)
    check('过短评论被拒绝', r.status_code == 400, f'-> {r.status_code}')

    print('\n=== 11. 越权保护 ===')
    r = client.put(f'/api/blogs/{blog_id}/update/', {
        'title': '恶意改标题', 'content': '恶意修改内容恶意修改内容',
        'category': 'tech',
    }, content_type='application/json', **bob_auth)
    check('越权编辑他人文章被拒绝 (403)', r.status_code == 403,
          f'-> {r.status_code}')
    check('越权提示为中文', '只能编辑自己' in str(body(r)), f'-> {body(r)}')

    r = client.delete(f'/api/blogs/{blog_id}/delete/', **bob_auth)
    check('越权删除他人文章被拒绝 (403)', r.status_code == 403,
          f'-> {r.status_code}')

    r = client.post('/api/blogs/create/', {
        'title': '伪造作者测试', 'content': '试图伪造他人身份发文的正文内容。',
        'category': 'tech', 'author': alice.id,
    }, content_type='application/json', **bob_auth)
    check('伪造 author 字段失效，作者取登录态',
          Blog.objects.filter(title='伪造作者测试',
                              author__username='smoke_bob').exists())
    forged = Blog.objects.filter(title='伪造作者测试').first()
    if forged:
        forged.delete()

    r = client.put(f'/api/blogs/{blog_id}/update/', {
        'title': 'Django 与 React 前后端分离实践（修订）',
        'content': '修订后的正文内容。' * 10,
        'category': 'backend',
    }, content_type='application/json', **auth)
    check('作者本人可编辑自己的文章', r.status_code == 200, f'-> {r.status_code}')

    print('\n=== 12. 归档 ===')
    r = client.get('/api/blogs/archive/')
    archive = body(r)
    check('归档接口返回 200', r.status_code == 200)
    check('归档包含 groups', 'groups' in archive)
    check('归档包含 years', 'years' in archive)
    check('归档分组带中文标签',
          archive.get('groups', [{}])[0].get('label', '').count('年') == 1,
          f"-> {archive.get('groups', [{}])[0].get('label')}")
    check('归档统计总数正确', archive.get('total', 0) >= 2)

    print('\n=== 13. 标签与热门 ===')
    r = client.get('/api/tags/')
    tags = body(r)
    check('标签接口返回 200', r.status_code == 200)
    check('标签带文章计数',
          all('count' in t for t in tags.get('results', [])))
    check('标签按热度倒序',
          tags.get('results', [{}])[0].get('count', 0) >=
          tags.get('results', [{}])[-1].get('count', 0))

    r = client.get('/api/blogs/hot/?limit=3')
    hot = body(r)
    check('热门文章接口可用', r.status_code == 200 and isinstance(hot, list),
          f'-> {r.status_code}')
    check('热门榜不超过限制条数', len(hot) <= 3)

    print('\n=== 14. 我的文章 ===')
    r = client.get('/api/blogs/my/', **auth)
    check('我的文章列表可用', r.status_code == 200, f'-> {r.status_code}')
    check('我的文章包含草稿', body(r).get('count') >= 2)

    print('\n=== 15. 个人资料 ===')
    r = client.get('/api/profile/me/', **auth)
    me = body(r)
    check('获取当前用户资料', r.status_code == 200, f'-> {r.status_code}')
    check('资料含统计字段',
          all(k in me for k in ('blog_count', 'favorite_count', 'liked_count')))
    check('资料含社交链接字段',
          all(k in me for k in ('website', 'github', 'twitter', 'weibo', 'zhihu')))

    r = client.patch('/api/profile/update/', {
        'nickname': '阿丽丝·改',
        'bio': '更新后的个人简介',
        'github': 'https://github.com/alice',
    }, content_type='application/json', **auth)
    check('修改个人资料成功', r.status_code == 200, f'-> {r.status_code} {body(r)}')
    alice.refresh_from_db()
    check('昵称已更新', alice.nickname == '阿丽丝·改', f'-> {alice.nickname}')
    check('GitHub 链接已保存', alice.github == 'https://github.com/alice')

    r = client.get(f'/api/profile/{alice.id}/')
    check('公开资料可访问', r.status_code == 200)

    r = client.get('/api/stats/')
    check('站点统计接口可用', r.status_code == 200, f'-> {r.status_code}')

    print('\n=== 16. 修改密码 ===')
    r = client.post('/api/auth/password/change/', {
        'old_password': 'WrongOldPwd1!',
        'new_password': 'NewMoYun#2026',
        'confirm_password': 'NewMoYun#2026',
    }, content_type='application/json', **auth)
    check('原密码错误被拒绝', r.status_code == 400, f'-> {r.status_code}')
    check('原密码错误提示为中文',
          '原密码不正确' in str(body(r)), f'-> {body(r)}')

    r = client.post('/api/auth/password/change/', {
        'old_password': 'MoYun#2026Aa',
        'new_password': 'NewMoYun#2026',
        'confirm_password': 'Mismatch#2026',
    }, content_type='application/json', **auth)
    check('两次新密码不一致被拒绝', r.status_code == 400, f'-> {r.status_code}')

    r = client.post('/api/auth/password/change/', {
        'old_password': 'MoYun#2026Aa',
        'new_password': 'NewMoYun#2026',
        'confirm_password': 'NewMoYun#2026',
    }, content_type='application/json', **auth)
    check('修改密码成功', r.status_code == 200, f'-> {r.status_code} {body(r)}')

    r = client.post('/api/token/', {'username': 'smoke_alice',
                                    'password': 'NewMoYun#2026'},
                    content_type='application/json')
    check('可用新密码登录', r.status_code == 200, f'-> {r.status_code}')
    auth = {'HTTP_AUTHORIZATION': f"Bearer {body(r)['access']}"}

    print('\n=== 17. 忘记密码 / 重置密码 ===')
    r = client.post('/api/auth/password/reset/',
                    {'email': 'not-exist@example.com'},
                    content_type='application/json')
    check('未注册邮箱被拒绝', r.status_code == 400, f'-> {r.status_code}')
    check('邮箱不存在提示为中文',
          '未注册' in str(body(r)), f'-> {body(r)}')

    r = client.post('/api/auth/password/reset/',
                    {'email': 'smoke_alice@example.com'},
                    content_type='application/json')
    reset = body(r)
    check('申请重置成功', r.status_code == 200, f'-> {r.status_code} {reset}')
    check('返回脱敏邮箱提示',
          '***' in str(reset.get('detail', '')), f"-> {reset.get('detail')}")
    uid = reset.get('uid')
    token = reset.get('token')
    check('开发模式返回重置链接', bool(reset.get('reset_link')))

    r = client.post('/api/auth/password/reset/verify/',
                    {'uid': uid, 'token': token},
                    content_type='application/json')
    check('校验重置链接有效', body(r).get('valid') is True, f'-> {body(r)}')

    r = client.post('/api/auth/password/reset/confirm/', {
        'uid': uid, 'token': 'invalid-token',
        'new_password': 'ResetPwd#2026',
        'confirm_password': 'ResetPwd#2026',
    }, content_type='application/json')
    check('无效令牌被拒绝', r.status_code == 400, f'-> {r.status_code}')

    r = client.post('/api/auth/password/reset/confirm/', {
        'uid': uid, 'token': token,
        'new_password': 'ResetPwd#2026',
        'confirm_password': 'ResetPwd#2026',
    }, content_type='application/json')
    check('重置密码成功', r.status_code == 200, f'-> {r.status_code} {body(r)}')

    r = client.post('/api/token/', {'username': 'smoke_alice',
                                    'password': 'ResetPwd#2026'},
                    content_type='application/json')
    check('重置后可用新密码登录', r.status_code == 200, f'-> {r.status_code}')
    auth = {'HTTP_AUTHORIZATION': f"Bearer {body(r)['access']}"}

    print('\n=== 18. 退出登录 ===')
    r = client.post('/api/auth/logout/', {'refresh': refresh},
                    content_type='application/json', **auth)
    check('退出登录成功', r.status_code == 200, f'-> {r.status_code} {body(r)}')
    r = client.post('/api/token/refresh/', {'refresh': refresh},
                    content_type='application/json')
    check('黑名单令牌无法再次刷新', r.status_code == 401, f'-> {r.status_code}')
    message = str(body(r))
    check('刷新失败提示为中文',
          any('\u4e00' <= ch <= '\u9fff' for ch in message),
          f'-> {body(r)}')

    print('\n=== 19. 清理测试数据 ===')
    # 注意：Blog.author 使用 SET_NULL，删除用户不会级联删除文章，
    # 必须先显式删除测试文章，否则会在库里留下孤儿数据。
    Blog.objects.filter(
        title__in=['Django 与 React 前后端分离实践',
                   'Django 与 React 前后端分离实践（修订）',
                   '第二条测试文章',
                   '伪造作者测试']
    ).delete()
    Blog.objects.filter(author__username__startswith='smoke_').delete()
    Profile.objects.filter(username__in=['smoke_alice', 'smoke_bob']).delete()
    Tag.objects.filter(name__startswith='冒烟').delete()

    check('测试数据已清理', not Profile.objects.filter(
        username__startswith='smoke_').exists())
    check('测试文章已清理', not Blog.objects.filter(
        title__contains='前后端分离实践').exists() and
        not Blog.objects.filter(title='第二条测试文章').exists())

    # ---------- 汇总 ----------
    print('\n' + '=' * 56)
    print(f'通过 {len(PASS)} 项，失败 {len(FAIL)} 项')
    if FAIL:
        print('失败清单：')
        for item in FAIL:
            print(f'  - {item}')
    print('=' * 56)

    return 0 if not FAIL else 1


if __name__ == '__main__':
    sys.exit(main())
