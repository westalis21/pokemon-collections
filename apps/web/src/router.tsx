import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { HomePage } from './pages/HomePage';
import { NewListPage } from './pages/NewListPage';
import { ListDetailPage } from './pages/ListDetailPage';
import { NotFoundPage } from './pages/NotFoundPage';

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/lists/new', element: <NewListPage /> },
      { path: '/lists/:id', element: <ListDetailPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
