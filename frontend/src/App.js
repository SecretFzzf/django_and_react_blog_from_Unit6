import { Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Footer from './components/Footer';
import Navbar from './components/Navbar';
import ScrollToTop from './components/ScrollToTop';
import { AuthContextProvider } from './context/AuthContext';
import PrivateRoutes from './utils/PrivateRoutes';

import Archive from './pages/Archive';
import BlogDetails from './pages/BlogDetails';
import Category from './pages/Category';
import CreateBlog from './pages/CreateBlog';
import EditBlog from './pages/EditBlog';
import EditProfile from './pages/EditProfile';
import Favorites from './pages/Favorites';
import ForgotPassword from './pages/ForgotPassword';
import Home from './pages/Home';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import Profile from './pages/Profile';
import ResetPassword from './pages/ResetPassword';
import Settings from './pages/Settings';
import SignUp from './pages/SignUp';
import Tags from './pages/Tags';

/** 页面切换动效：淡入 + 轻微上移 */
const pageVariants = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

const pageTransition = {
  duration: 0.34,
  ease: [0.22, 1, 0.36, 1],
};

/** 带过渡动画的页面容器 */
const Page = ({ children }) => (
  <motion.div
    variants={pageVariants}
    initial="initial"
    animate="animate"
    exit="exit"
    transition={pageTransition}
  >
    {children}
  </motion.div>
);

/**
 * 路由表 + 页面切换动画。
 *
 * AnimatePresence 的 mode="wait" 保证上一页完全退出后再渲染下一页，
 * 避免两个页面同时占据视口造成布局跳动。
 */
const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        {/* ==================== 公开页面 ==================== */}
        <Route
          path="/"
          element={
            <Page>
              <Home />
            </Page>
          }
        />
        <Route
          path="/blog/:id"
          element={
            <Page>
              <BlogDetails />
            </Page>
          }
        />
        <Route
          path="/tags"
          element={
            <Page>
              <Tags />
            </Page>
          }
        />
        <Route
          path="/archive"
          element={
            <Page>
              <Archive />
            </Page>
          }
        />
        <Route
          path="/category/:category"
          element={
            <Page>
              <Category />
            </Page>
          }
        />

        {/* ==================== 账号相关 ==================== */}
        <Route
          path="/login"
          element={
            <Page>
              <Login />
            </Page>
          }
        />
        <Route
          path="/signup"
          element={
            <Page>
              <SignUp />
            </Page>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <Page>
              <ForgotPassword />
            </Page>
          }
        />
        {/* 重置链接格式：/reset-password/{uid}/{token} */}
        <Route
          path="/reset-password/:uid/:token"
          element={
            <Page>
              <ResetPassword />
            </Page>
          }
        />
        {/* 兼容不带 uid 的旧格式，uid 通过 ?uid= 传入 */}
        <Route
          path="/reset-password/:token"
          element={
            <Page>
              <ResetPassword />
            </Page>
          }
        />

        {/* ==================== 需要登录 ==================== */}
        <Route element={<PrivateRoutes />}>
          <Route
            path="/profile"
            element={
              <Page>
                <Profile />
              </Page>
            }
          />
          <Route
            path="/edit-profile"
            element={
              <Page>
                <EditProfile />
              </Page>
            }
          />
          <Route
            path="/settings"
            element={
              <Page>
                <Settings />
              </Page>
            }
          />
          <Route
            path="/favorites"
            element={
              <Page>
                <Favorites />
              </Page>
            }
          />
          <Route
            path="/create"
            element={
              <Page>
                <CreateBlog />
              </Page>
            }
          />
          <Route
            path="/edit/:id"
            element={
              <Page>
                <EditBlog />
              </Page>
            }
          />
        </Route>

        {/* ==================== 404 ==================== */}
        <Route
          path="*"
          element={
            <Page>
              <NotFound />
            </Page>
          }
        />
      </Routes>
    </AnimatePresence>
  );
};

const App = () => (
  <AuthContextProvider>
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <Navbar />

      <main className="flex-1">
        <AnimatedRoutes />
      </main>

      <Footer />

      <ToastContainer
        position="top-center"
        autoClose={3200}
        newestOnTop
        closeOnClick
        pauseOnFocusLoss={false}
        pauseOnHover
        draggable
        limit={3}
        theme="dark"
      />
    </div>
  </AuthContextProvider>
);

export default App;
