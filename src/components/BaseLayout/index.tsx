import { Outlet } from 'react-router-dom';

export default function BaseLayout() {
  return (
    <div className="flex flex-col h-screen w-screen">
      <header className="justify-between items-center w-screen h-100px">
        这是头部
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="w-screen h-100px">这是底部</footer>
    </div>
  );
}
