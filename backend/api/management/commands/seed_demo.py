"""
墨韵博客 · 示例数据填充命令

用法：
    python manage.py seed_demo              # 填充示例数据
    python manage.py seed_demo --flush      # 先清空示例数据再填充
    python manage.py seed_demo --users 3 --posts 12

说明：
    所有示例账号的密码统一为 Demo@2026，登录后可体验完整功能。
    示例账号的用户名以 demo_ 开头，可通过 --flush 一键清除。
"""

import random

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from api.models import Blog, Comment, Favorite, Tag

User = get_user_model()

DEMO_PASSWORD = 'Demo@2026'

DEMO_USERS = [
    {
        'username': 'demo_moyun',
        'nickname': '墨韵',
        'email': 'demo_moyun@example.com',
        'bio': '全栈工程师，喜欢把复杂的事情讲简单。关注 Django、React 与工程化实践。',
        'github': 'https://github.com/',
        'website': 'https://example.com/',
    },
    {
        'username': 'demo_qingfeng',
        'nickname': '清风',
        'email': 'demo_qingfeng@example.com',
        'bio': '算法与人工智能方向，热爱读论文，也热爱写读书笔记。',
        'zhihu': 'https://www.zhihu.com/',
    },
    {
        'username': 'demo_lanyu',
        'nickname': '澜屿',
        'email': 'demo_lanyu@example.com',
        'bio': '产品设计师，关注体验、排版与生活美学。',
        'weibo': 'https://weibo.com/',
    },
]

# (标题, 分类, 标签, 正文)
DEMO_POSTS = [
    (
        'Django 4.2 与 React 18 前后端分离实战：从零搭建可维护的博客系统',
        'backend',
        ['Django', 'React', 'DRF'],
        """## 为什么选择前后端分离

传统 Django 模板渲染在中小型项目中依然高效，但当交互复杂度上升（实时搜索、无限滚动、
局部刷新）之后，前后端分离带来的收益会迅速超过它的成本。

本文以一个真实博客系统为例，梳理一套可以直接落到生产环境的架构方案。

## 后端：把接口层做薄

Django REST Framework 的价值在于「约定」：序列化、认证、分页、异常处理都有标准位置。

```python
class BlogSerializer(serializers.ModelSerializer):
    tags = TagRelatedField(required=False)

    class Meta:
        model = Blog
        fields = ['id', 'title', 'content', 'tags', 'views', 'is_top']

    def validate_title(self, value):
        if len(value.strip()) < 2:
            raise serializers.ValidationError('标题至少需要 2 个字符。')
        return value.strip()
```

注意几个容易被忽略的点：

1. **分页要全局配置**，避免每个视图重复实现；
2. **异常要统一中文化**，否则前端必须维护一份错误码映射表；
3. **浏览量用 `F()` 表达式原子自增**，不要 `blog.views += 1`。

## 前端：把状态收敛到一处

前端的复杂度大多来自「同一份状态散落在多个组件里」。我的做法是：

- 令牌与用户信息统一放在 `AuthContext`
- 所有网络请求走同一个 axios 实例
- 401 拦截 → 自动刷新 → 重放原请求，业务代码完全无感

```js
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      const access = await refreshAccessToken();
      error.config.headers.Authorization = `Bearer ${access}`;
      return api(error.config);
    }
    return Promise.reject(error);
  }
);
```

## 部署清单

> 上线前请务必确认：`DEBUG=False`、`ALLOWED_HOSTS` 收敛、媒体文件交由 Nginx 托管、
> `SECRET_KEY` 通过环境变量注入。

这是一份不断生长的清单，欢迎在评论区补充你自己的经验。""",
    ),
    (
        'MySQL 8 的 utf8mb4 到底解决了什么问题？',
        'database',
        ['MySQL', '数据库', '字符集'],
        """## 一句话回答

`utf8mb4` 让 MySQL 能够存储 **完整的 Unicode 字符集**，包括所有 emoji。

## 历史上的坑

MySQL 的 `utf8` 实际上是一个「阉割版」——每个字符最多 3 字节，
而 Unicode 中大量字符（如 emoji 😂）需要 4 字节。

这导致两个经典故障：

- 插入 emoji 直接报错 `Incorrect string value`
- 从emoji 到中文生僻字，全都存不进去

## 正确做法

```sql
CREATE DATABASE blog_db
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

Django 侧也要显式声明，否则连接层会回落到默认字符集：

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'OPTIONS': {
            'charset': 'utf8mb4',
            'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
        },
    }
}
```

## 还需要注意

| 项目 | 建议值 | 说明 |
| --- | --- | --- |
| `character_set_server` | `utf8mb4` | 服务端默认字符集 |
| `collation_server` | `utf8mb4_unicode_ci` | 排序规则 |
| 字段长度 | 控制在 191 以内 | 兼容旧版索引限制 |

改字符集是少数「越早做越省事」的决策之一。等到线上表有几千万行再改，
代价会高出一个数量级。""",
    ),
    (
        'React 18 并发特性笔记：useTransition 与 useDeferredValue',
        'frontend',
        ['React', '前端', '性能优化'],
        """## 问题的起点

当一个列表很长，而用户又在实时输入过滤条件时，输入框会明显卡顿。
原因是：**每次按键都触发了一次同步的高开销渲染**。

React 18 引入了「并发渲染」来解决这类问题。

## useDeferredValue：让昂贵的部分慢一点

```jsx
function SearchList({ keyword }) {
  const deferredKeyword = useDeferredValue(keyword);
  const results = useMemo(() => heavyFilter(deferredKeyword), [deferredKeyword]);

  return (
    <>
      <SearchInput value={keyword} />
      <List items={results} />
    </>
  );
}
```

关键在于：输入框使用的是**最新的** `keyword`，而列表使用的是**稍旧的** `deferredKeyword`。
用户感知到的是「输入丝滑，列表稍后跟上」。

## useTransition：把更新标记为非紧急

```jsx
const [isPending, startTransition] = useTransition();

const handleChange = (event) => {
  const value = event.target.value;
  setKeyword(value);                      // 紧急：立刻回显
  startTransition(() => {
    setActiveTab(value);                  // 非紧急：可以被打断
  });
};
```

## 两者怎么选

| 场景 | 推荐 |
| --- | --- |
| 已经有一个可以「延后」的值 | `useDeferredValue` |
| 需要包裹一段状态更新逻辑 | `useTransition` |
| 需要拿到 `isPending` 做加载态 | `useTransition` |

## 一个容易踩的坑

并发特性**不会**让你的代码变快，它只是让浏览器有机会在合适的时机让出主线程。
真正的性能瓶颈（比如 O(n²) 的过滤算法）仍然需要你自己优化。

> 先测量，再优化。React DevTools Profiler 永远是最好的起点。""",
    ),
    (
        '从零实现一个 Markdown 渲染器：我踩过的 7 个坑',
        'algorithm',
        ['Markdown', '解析器', '工程实践'],
        """## 为什么要自己写

现成的库很多，但当你需要**完全控制输出结构**（比如给每个代码块注入复制按钮、
给标题自动生成锚点）时，理解底层解析过程是必要的。

## 坑 1：行内语法与块级语法的优先级

`**加粗**` 是行内的，`## 标题` 是块级的。如果先处理行内，
标题标记会被误伤。

## 坑 2：代码块必须最先提取

```text
这里是示例文本，**不应该被加粗**
```

代码块中的内容必须原样保留。正确顺序是：

1. 先提取所有代码块，替换为占位符
2. 处理其余块级语法
3. 处理行内语法
4. 把占位符换回代码块

## 坑 3：HTML 转义必须早于语法解析

否则用户输入的 `<script>` 会变成真正的标签——这就是最经典的 XSS。

```js
const escapeHtml = (text) =>
  text.replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
```

## 坑 4-7：简记

- **嵌套列表** 需要按缩进层级递归，不能用单层正则
- **表格对齐标记** `:---:` 要区分左/中/右对齐
- **链接内的括号** `[a](b(c))` 需要括号配对计数
- **性能** 大文档要避免回溯灾难性的正则

## 结论

自己写解析器是很好的学习路径，但**生产环境请优先使用成熟库**。
理解原理的价值在于：当库的输出不符合需求时，你知道该在哪里动手。""",
    ),
    (
        '大模型时代的工程判断力',
        'ai',
        ['人工智能', '思考', '工程实践'],
        """## 工具变强了，判断力更贵了

当生成代码的成本趋近于零，**判断哪段代码值得写** 就成了新的瓶颈。

## 三个正在贬值的能力

1. 记住 API 的具体签名
2. 手写样板代码
3. 从零搭建项目骨架

## 三个正在升值的能力

1. **定义问题**：把模糊的业务诉求翻译成精确的技术目标
2. **判断取舍**：在一致性、性能、交付速度之间做出可辩护的权衡
3. **验证结论**：知道怎么用最小成本证伪一个假设

## 一个具体的例子

同一个需求，两种做法：

```python
# 方案 A：全量查出来在 Python 里筛
posts = list(Blog.objects.all())
hot = [p for p in posts if p.views > 1000][:10]

# 方案 B：交给数据库
hot = Blog.objects.filter(views__gt=1000).order_by('-views')[:10]
```

方案 A 在 100 条数据时完全正确，在 100 万条时会让服务不可用。
**这两段代码都能被自动生成，但选择哪一个，取决于你。**

## 结语

> 稀缺的从来不是答案，而是值得回答的问题。

保持对问题的敏感度，比囤积工具更重要。""",
    ),
    (
        '程序员如何读一本书：我的三层笔记法',
        'reading',
        ['读书笔记', '方法论', '成长'],
        """## 为什么读完就忘

因为「读完」本身不产生留存。留存来自**提取**——把内容从书里搬到自己的体系里。

## 第一层：划线（输入）

只做一件事：标记让你停顿的地方。

**规则**：如果一句话没有让你停顿，说明它已经在你的知识范围内，不需要记。

## 第二层：卡片（消化）

每张卡片只写一个观点，用自己的话，不超过 200 字。

```text
【观点】心流产生的三个条件：明确目标、即时反馈、难度略高于能力。
【我的例子】写代码时最专注的时刻，往往是修一个"差一点就能解决"的 bug。
【反例】开一个没有明确验收标准的会议，永远不会有心流。
```

关键在于 **「我的例子」和「反例」**——它们才是真正属于你的部分。

## 第三层：索引（连接）

把卡片按主题串起来，形成「问题 → 观点 → 例子」的索引。

| 主题 | 相关卡片 | 我的结论 |
| --- | --- | --- |
| 专注力 | #12 #27 #41 | 环境设计比意志力可靠 |
| 学习效率 | #18 #35 | 输出倒逼输入 |

## 什么时候可以放弃一本书

**随时。** 沉没成本不该绑架你的注意力。
一本书读 30 页发现不适合，放下它，你只损失了 30 页。

> 读书不是任务，是工具。工具不好用就换一个。""",
    ),
    (
        '深夜的代码与白天的会议',
        'life',
        ['生活随笔', '职场'],
        """## 两种时间

白天的会议室里，时间是被切碎的。每 25 分钟一个议题，每个议题需要一个结论。

深夜的书桌前，时间是一条连续的线。你可以连续思考三个小时，
让一个模糊的想法慢慢收拢成一个具体的方案。

## 我的做法

不再对抗这个节奏，而是**按任务类型分配时间**：

- **需要连续深度思考的事** → 留给早晨或深夜
- **需要协作对齐的事** → 放在白天
- **不需要脑力的事** → 塞进碎片时间

## 一个小的察觉

真正让我疲惫的从来不是工作量大，而是**频繁的上下文切换**。

从「写一个复杂的查询优化」切到「回复一条群消息」，再切回来——
代价不是那两分钟，而是重新进入状态的那二十分钟。

## 所以

保护你的连续时间，比保护你的休息时间更重要。

> 深度工作需要的不只是时间，而是一段不被打断的时间。""",
    ),
    (
        '职级晋升答辩：如何讲清楚你的技术价值',
        'career',
        ['职场成长', '沟通', '思考'],
        """## 一个常见的失败模式

候选人花了 20 分钟讲技术方案有多精妙，评委听完只问了一句：
**「所以业务上发生了什么变化？」**

技术价值必须在业务的坐标系里被翻译一次。

## 三段式结构

**第一段：问题有多痛**

不要描述技术问题，描述业务后果。

| 不要这样说 | 换成这样说 |
| --- | --- |
| 接口响应慢 | 用户下单时平均等待 4.2 秒，日流失约 3% |
| 代码耦合严重 | 每次改活动规则要 5 人日，去年同期只要 1 人日 |

**第二段：你做了什么权衡**

这是最能体现级别差异的部分。不要只讲「我做了什么」，
要讲 **「我为什么没做另外两个方案」**。

**第三段：可验证的结果**

- 有数字的用数字
- 没数字的用他人证言
- 都没有的，说明这次尝试的**认知收获**

## 一个提醒

> 答辩不是述职报告，是一次**技术判断力**的展示。

准备好「如果重来一次，你会哪里做得不一样」这个问题的答案。""",
    ),
    (
        'Tailwind CSS 深色主题设计系统搭建指南',
        'frontend',
        ['Tailwind', '设计系统', 'CSS'],
        """## 从色板开始

深色主题最大的坑是**对比度不够**。纯黑背景配纯白文字会让人眼睛疲劳。

我的做法是三层结构：

- **页面底色** `#0B0F17`（带一点蓝，不要纯黑）
- **卡片浮层** `rgba(17,24,39,0.6)` + 模糊背景
- **文字** `#E6EAF3`（不要纯白，降低一档亮度）

```js
// tailwind.config.js
colors: {
  ink: {
    900: '#0B0F17',
    850: '#111827',
    800: '#141a28',
  },
}
```

## 玻璃拟态的三个必要元素

1. **半透明背景** — `bg-slate-900/60`
2. **背景模糊** — `backdrop-blur-md`
3. **微光边框** — `border border-white/10`

缺一个就会显得「脏」而不是「透」。

## 强调色的用法

渐变要克制。我的规则是：**整个页面同一时间只出现一到两处高强度渐变**。

```jsx
<div className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600">
  {/* 只用于主按钮和标题强调 */}
</div>
```

## 阴影不是越黑越好

深色背景下，阴影的可见度很低。改用**发光**更自然：

```js
boxShadow: {
  glow: '0 0 24px -4px rgba(99, 102, 241, 0.55)',
}
```

## 最后

> 深色主题的目标不是「变黑」，而是**建立层次**。
> 如果关掉所有边框和阴影，页面还能看出层次，说明色板是成功的。""",
    ),
    (
        '高效工具链：我的 2026 前端开发环境',
        'tools',
        ['工具效率', '工程化'],
        """## 编辑器

主力仍是 VS Code，但插件只留了 6 个。**插件越多，干扰越多**。

## 终端

Windows 上推荐 Git Bash + Windows Terminal，路径转换和 Unix 工具齐全。

```bash
# 常用别名
alias gs="git status -sb"
alias gl="git log --oneline -12 --graph"
alias py="python"
```

## 提效的三个习惯

1. **一切都脚本化**：重复三次以上的操作，写成脚本
2. **保持工作区干净**：每天结束前清掉临时文件
3. **定期重构配置文件**：半年没看的配置，八成可以删

## 一个反直觉的建议

**不要追新工具**。

工具的价值在于熟练度，而不是新颖度。把时间花在深化已有工具的使用上，
回报率远高于重新学习一个替代品。

> 最好的工具是那个你已经完全不需要思考就能使用的工具。""",
    ),
]


class Command(BaseCommand):
    help = '填充墨韵博客的示例数据（用户 / 文章 / 标签 / 评论 / 收藏）'

    def add_arguments(self, parser):
        parser.add_argument(
            '--flush', action='store_true',
            help='先删除所有 demo_ 前缀的示例账号及其文章，再重新填充')
        parser.add_argument(
            '--users', type=int, default=len(DEMO_USERS),
            help='创建示例用户的数量（默认全部 3 个）')
        parser.add_argument(
            '--posts', type=int, default=len(DEMO_POSTS),
            help='创建示例文章的数量（默认全部 10 篇）')

    @transaction.atomic
    def handle(self, *args, **options):
        if options['flush']:
            deleted = User.objects.filter(username__startswith='demo_').delete()
            self.stdout.write(self.style.WARNING(
                f'已清除旧的示例数据（影响 {deleted[0]} 行）'))

        users = self._create_users(options['users'])
        posts = self._create_posts(users, options['posts'])

        if posts:
            self._create_interactions(users, posts)

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('=' * 56))
        self.stdout.write(self.style.SUCCESS('示例数据填充完成'))
        self.stdout.write(self.style.SUCCESS('=' * 56))
        self.stdout.write(f'  用户：{len(users)} 个')
        self.stdout.write(f'  文章：{len(posts)} 篇')
        self.stdout.write(f'  标签：{Tag.objects.count()} 个')
        self.stdout.write(f'  评论：{Comment.objects.count()} 条')
        self.stdout.write(f'  收藏：{Favorite.objects.count()} 条')
        self.stdout.write('')
        self.stdout.write(self.style.HTTP_INFO('示例账号（密码统一为 Demo@2026）：'))
        for user in users:
            self.stdout.write(f'  · {user.username}  昵称：{user.nickname}')
        self.stdout.write('')
        self.stdout.write('立即体验：')
        self.stdout.write('  1. 启动后端：python manage.py runserver')
        self.stdout.write('  2. 启动前端：cd frontend && npm start')
        self.stdout.write('  3. 浏览器打开：http://localhost:3000')
        self.stdout.write('')

    # ---------------- 用户 ----------------
    def _create_users(self, limit):
        users = []
        for spec in DEMO_USERS[:limit]:
            user = User.objects.filter(username=spec['username']).first()
            if user is None:
                user = User(
                    username=spec['username'],
                    email=spec['email'],
                    nickname=spec['nickname'],
                    bio=spec['bio'],
                    website=spec.get('website', ''),
                    github=spec.get('github', ''),
                    twitter=spec.get('twitter', ''),
                    weibo=spec.get('weibo', ''),
                    zhihu=spec.get('zhihu', ''),
                )
                user.set_password(DEMO_PASSWORD)
                user.save()
                self.stdout.write(f'  + 创建用户 {user.nickname}（{user.username}）')
            else:
                self.stdout.write(f'  = 用户已存在 {user.nickname}（{user.username}）')
            users.append(user)
        return users

    # ---------------- 文章 ----------------
    def _create_posts(self, users, limit):
        if not users:
            return []

        posts = []
        for index, (title, category, tag_names, content) in enumerate(
                DEMO_POSTS[:limit]):
            # 按索引轮换作者，避免全部挂在同一个人名下
            author = users[index % len(users)]

            post = Blog.objects.filter(title=title).first()
            if post is None:
                post = Blog.objects.create(
                    author=author,
                    title=title,
                    content=content,
                    category=category,
                    publish_status=True,
                    is_top=(index == 0),
                    # 制造一些区分度，让热门榜单不单调
                    views=random.randint(60, 2600),
                )
                self.stdout.write(f'  + 创建文章《{title[:22]}…》')
            else:
                self.stdout.write(f'  = 文章已存在《{title[:22]}…》')

            tags = []
            for name in tag_names:
                tag, _ = Tag.objects.get_or_create(name=name)
                tags.append(tag)
            if tags:
                post.tags.set(tags)

            posts.append(post)

        return posts

    # ---------------- 点赞 / 收藏 / 评论 ----------------
    def _create_interactions(self, users, posts):
        comment_pool = [
            '写得很清楚，尤其是权衡那一段，受教了。',
            '刚好在做一个类似的项目，这篇来得正是时候。',
            '收藏了，周末慢慢看。',
            '第三点我踩过同样的坑，补充一个思路：先在本地复现再改。',
            '请问有配套的示例仓库吗？想对照着读一遍。',
            '排版读起来很舒服，没有多余的废话。',
        ]

        for index, post in enumerate(posts):
            # 点赞：让每篇文章有 1~3 个赞
            for user in random.sample(users, random.randint(1, len(users))):
                post.likes.add(user)

            # 收藏：让部分文章被收藏
            if index % 3 != 2:
                for user in random.sample(users, random.randint(1, len(users))):
                    Favorite.objects.get_or_create(user=user, blog=post)

            # 评论：让部分文章有评论
            if index % 2 == 0:
                for user in random.sample(users, random.randint(1, 2)):
                    body = random.choice(comment_pool)
                    if not Comment.objects.filter(blog=post, user=user,
                                                  body=body).exists():
                        Comment.objects.create(blog=post, user=user, body=body)
