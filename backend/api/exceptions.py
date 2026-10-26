"""
墨韵博客 - 全局异常处理

将 DRF / Django 抛出的英文错误统一翻译为自然得体的简体中文，
前端无需再做任何错误文案映射。

统一响应体：
    {
        "detail":  "主要错误提示（中文）",
        "message": "同 detail，便于前端兼容",
        "errors":  {"字段中文名": ["具体提示", ...]}
    }
"""

from django.core.exceptions import ObjectDoesNotExist, PermissionDenied
from django.http import Http404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

# 字段名 -> 中文标签
FIELD_LABELS = {
    'username': '用户名',
    'password': '密码',
    'new_password': '新密码',
    'old_password': '原密码',
    'confirm_password': '确认密码',
    'email': '邮箱',
    'photo': '头像',
    'bio': '个人简介',
    'nickname': '昵称',
    'title': '标题',
    'content': '正文',
    'category': '分类',
    'image': '封面图',
    'tags': '标签',
    'body': '评论内容',
    'token': '令牌',
    'refresh': '刷新令牌',
    'uid': '用户标识',
    'website': '个人网站',
    'github': 'GitHub 地址',
    'twitter': 'X / Twitter 地址',
    'weibo': '微博地址',
    'zhihu': '知乎地址',
}

# Django / SimpleJWT 内置英文提示 -> 中文
MESSAGE_MAP = {
    'This field is required.': '该项为必填项。',
    'This field may not be blank.': '该项不能为空。',
    'This field may not be null.': '该项不能为空。',
    'Enter a valid email address.': '请输入有效的邮箱地址。',
    'Enter a valid URL.': '请输入有效的网址（需以 http:// 或 https:// 开头）。',
    'A user with that username already exists.': '该用户名已被注册，请更换一个。',
    'This password is too short. It must contain at least 8 characters.':
        '密码长度不足 8 位，请重新设置。',
    'This password is too common.': '该密码过于常见，容易被猜解，请更换。',
    'This password is entirely numeric.': '密码不能全部由数字组成。',
    'The password is too similar to the username.':
        '密码与用户名过于相似，请更换。',
    'No active account found with the given credentials':
        '用户名或密码错误，请重新输入。',
    'Given token not valid for any token type': '登录状态已失效，请重新登录。',
    'Token is invalid or expired': '令牌无效或已过期，请重新登录。',
    'Token is blacklisted': '该令牌已失效，请重新登录。',
    'Signature has expired': '登录状态已过期，请重新登录。',
    'Authentication credentials were not provided.':
        '请先登录后再进行此操作。',
}


def _translate_message(message):
    """逐条翻译英文提示；已是中文的原样返回。"""
    if not isinstance(message, str):
        return str(message)

    if message in MESSAGE_MAP:
        return MESSAGE_MAP[message]

    # 已包含中文字符，说明业务层已给出中文提示
    if any('\u4e00' <= ch <= '\u9fff' for ch in message):
        return message

    # 兜底的模糊匹配
    lowered = message.lower()
    if 'this field is required' in lowered:
        return '该项为必填项。'
    if 'may not be blank' in lowered or 'may not be null' in lowered:
        return '该项不能为空。'
    if 'already exists' in lowered:
        return '该内容已存在，请勿重复提交。'
    if 'too short' in lowered:
        return '内容长度不足，请补充后重试。'
    if 'ensure this value has at most' in lowered:
        return '内容长度超出限制，请精简后重试。'
    if 'not a valid' in lowered or 'invalid' in lowered:
        return '格式不正确，请检查后重试。'
    return message


def _flatten_errors(detail):
    """把 DRF 的嵌套错误结构压平成 {字段中文名: [中文提示]}。"""
    flat = {}

    if isinstance(detail, dict):
        for field, errors in detail.items():
            label = FIELD_LABELS.get(field, field)
            if isinstance(errors, dict):
                merged = []
                for values in _flatten_errors(errors).values():
                    merged.extend(values if isinstance(values, list) else [values])
                flat[label] = merged
            elif isinstance(errors, (list, tuple)):
                flat[label] = [_translate_message(str(e)) for e in errors]
            else:
                flat[label] = [_translate_message(str(errors))]
    elif isinstance(detail, (list, tuple)):
        flat['错误'] = [_translate_message(str(e)) for e in detail]
    else:
        flat['错误'] = [_translate_message(str(detail))]

    return flat


def _first_message(flat, fallback):
    for messages in flat.values():
        for text in messages:
            if isinstance(text, str) and text:
                return text
    return fallback


def _respond(status_code, message, errors):
    return Response(
        {'detail': message, 'message': message, 'errors': errors},
        status=status_code,
    )


def chinese_exception_handler(exc, context):
    """DRF 全局异常处理器：统一中文化。"""
    response = drf_exception_handler(exc, context)

    # ---- DRF 未接管的情况，手动兜底 ----
    if response is None:
        if isinstance(exc, (Http404, ObjectDoesNotExist)):
            return _respond(status.HTTP_404_NOT_FOUND,
                            '请求的内容不存在或已被删除。',
                            {'错误': ['资源不存在']})
        if isinstance(exc, PermissionDenied):
            return _respond(status.HTTP_403_FORBIDDEN,
                            '您没有权限执行该操作。',
                            {'错误': ['权限不足']})
        return None

    status_code = response.status_code
    data = response.data

    # ---- 400：表单 / 字段校验错误 ----
    if status_code == status.HTTP_400_BAD_REQUEST:
        if isinstance(data, dict) and set(data.keys()) == {'non_field_errors'}:
            flat = _flatten_errors(data['non_field_errors'])
        else:
            flat = _flatten_errors(data)
        message = _first_message(flat, '提交的数据有误，请检查后重试。')
        return _respond(status_code, message, flat)

    # ---- 401 / 403 ----
    if status_code == status.HTTP_401_UNAUTHORIZED:
        detail = data.get('detail') if isinstance(data, dict) else data
        message = _translate_message(str(detail)) if detail else \
            '登录状态已失效，请重新登录。'
        return _respond(status_code, message, {'错误': [message]})

    if status_code == status.HTTP_403_FORBIDDEN:
        detail = data.get('detail') if isinstance(data, dict) else data
        message = _translate_message(str(detail)) if detail else \
            '您没有权限执行该操作。'
        return _respond(status_code, message, {'错误': [message]})

    if status_code == status.HTTP_404_NOT_FOUND:
        return _respond(status_code, '请求的内容不存在或已被删除。',
                        {'错误': ['资源不存在']})

    if status_code == status.HTTP_405_METHOD_NOT_ALLOWED:
        return _respond(status_code, '该接口不支持当前请求方式。',
                        {'错误': ['请求方式不被允许']})

    if status_code == status.HTTP_429_TOO_MANY_REQUESTS:
        return _respond(status_code, '操作过于频繁，请稍后再试。',
                        {'错误': ['请求频率超限']})

    if status_code >= 500:
        return _respond(status_code, '服务器开小差了，请稍后再试。',
                        {'错误': ['服务器内部错误']})

    return response
