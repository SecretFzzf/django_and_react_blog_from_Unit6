"""
墨韵博客 - 管理后台表单

用于 django.contrib.admin 中创建 / 修改用户。
"""

from django.contrib.auth.forms import UserChangeForm, UserCreationForm

from .models import Profile


class ProfileCreationForm(UserCreationForm):
    """后台新建用户表单。"""

    class Meta:
        model = Profile
        fields = ('username', 'email', 'nickname', 'photo', 'bio')

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['username'].label = '用户名'
        self.fields['username'].help_text = '必填。150 个字符以内，仅限字母、数字与 @/./+/-/_'
        self.fields['email'].label = '邮箱'
        self.fields['nickname'].label = '昵称'
        self.fields['photo'].label = '头像'
        self.fields['bio'].label = '个人简介'
        self.fields['password1'].label = '密码'
        self.fields['password2'].label = '确认密码'


class ProfileChangeForm(UserChangeForm):
    """后台修改用户表单。"""

    class Meta:
        model = Profile
        fields = ('username', 'email', 'nickname', 'photo', 'bio', 'website',
                  'github', 'twitter', 'weibo', 'zhihu')

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for name, field in self.fields.items():
            field.label = {
                'username': '用户名',
                'email': '邮箱',
                'nickname': '昵称',
                'photo': '头像',
                'bio': '个人简介',
                'website': '个人网站',
                'github': 'GitHub',
                'twitter': 'X / Twitter',
                'weibo': '微博',
                'zhihu': '知乎',
            }.get(name, field.label)
