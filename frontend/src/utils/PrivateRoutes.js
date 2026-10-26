import { useContext } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import AuthContext from '../context/AuthContext';

/**
 * 受保护路由：
 * 未登录时跳转到登录页，并把当前路径带到 state 中，
 * 登录成功后可回跳到原页面。
 */
const PrivateRoutes = () => {
  const { user } = useContext(AuthContext);
  const location = useLocation();

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname,
          message: '请先登录后再访问该页面。',
        }}
      />
    );
  }

  return <Outlet />;
};

export default PrivateRoutes;
