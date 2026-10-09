import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { Layers, Menu, X, ArrowUpRight } from 'lucide-react';
import gsap from 'gsap';
import { useAppStore } from '../features/game/store';
import { useConfirm } from '../components/ui/confirm';
import { Button } from '../components/ui/button';
import { Empty } from '../components/shared';
import { Home } from '../pages/Home';
import { Categories } from '../pages/Categories';
import { SetupPage } from '../pages/Setup';
import { Play } from '../pages/Play';
import { Results } from '../pages/Results';
import { Admin, AdminCategory } from '../pages/Admin';
import { clearExits } from '../services/motion';
import { Effects } from '../features/preferences/Effects';
import { PreferencesDialog, SoundToggle } from '../features/preferences/Controls';
import { usePreferences } from '../features/preferences/store';
import { useMotion, motionDurations } from '../features/preferences/motion';
export function App() {
  const motion = useMotion();
  const store = useAppStore(),
    location = useLocation(),
    confirm = useConfirm(),
    [menu, setMenu] = useState(false),
    main = useRef<HTMLElement>(null);
  useEffect(() => {
    usePreferences.getState().init();
    void useAppStore.getState().init();
  }, []);
  useEffect(() => {
    setMenu(false);
    window.scrollTo(0, 0);
    clearExits();
    if (!store.ready) return;
    const context = gsap.context(() => {
      if (motion === 'full')
        gsap.fromTo(
          'h1',
          { y: 6, opacity: 0.8 },
          { y: 0, opacity: 1, duration: motionDurations.panel / 1000, clearProps: 'all' },
        );
    }, main);
    return () => context.revert();
  }, [location.pathname, store.ready, motion]);
  return (
    <>
      <a className="skip-link" href="#main">
        Ir al contenido
      </a>
      <header className="app-header">
        <div className="nav-inner">
          <Link className="brand" to="/" aria-label="NO ESCUCHES, inicio">
            <span className="brand-icon">
              <Layers size={20} aria-hidden="true" />
            </span>
            NO ESCUCHES<span className="brand-period">.</span>
          </Link>
          <div className="header-controls">
            <SoundToggle />
            <PreferencesDialog />
            <Button
              variant="ghost"
              className="menu-toggle"
              aria-expanded={menu}
              aria-controls="navigation"
              aria-label={menu ? 'Cerrar menú' : 'Abrir menú'}
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
            </Button>
          </div>
          <nav
            id="navigation"
            className={menu ? 'nav-links open' : 'nav-links'}
            aria-label="Navegación principal"
          >
            <NavLink to="/game/new">Nueva partida</NavLink>
            <NavLink to="/categories">Categorías</NavLink>
            <NavLink to="/admin">
              Admin
              <ArrowUpRight size={14} aria-hidden="true" />
            </NavLink>
          </nav>
        </div>
      </header>
      <Effects />
      <main
        id="main"
        tabIndex={-1}
        ref={main}
        className={`main ${location.pathname === '/game/play' ? 'main-play' : ''}`}
      >
        {!store.ready ? (
          <p role="status">Recuperando tu mesa…</p>
        ) : (
          <>
            {(['catalog', 'game', 'save'] as const).map(
              (area) =>
                store.errors[area] && (
                  <div className="notice error-notice persistent-error" role="alert" key={area}>
                    <strong>
                      {area === 'catalog'
                        ? 'No se pudo abrir el catálogo'
                        : area === 'game'
                          ? 'No se pudo abrir la partida'
                          : 'No se pudo guardar'}
                    </strong>
                    <p>{store.errors[area]}</p>
                    {area !== 'save' && (
                      <Button
                        variant="secondary"
                        onClick={async () => {
                          if (
                            await confirm(
                              area === 'catalog'
                                ? '¿Restablecer el catálogo?'
                                : '¿Restablecer la partida?',
                              area === 'catalog'
                                ? 'Se reemplazarán solo los datos del catálogo por los ejemplos iniciales.'
                                : 'Se reemplazarán solo la partida guardada y su snapshot.',
                              'Restablecer',
                            )
                          )
                            await store.recover(area);
                        }}
                      >
                        Restablecer {area === 'catalog' ? 'catálogo' : 'partida'}
                      </Button>
                    )}
                  </div>
                ),
            )}
            <div className="route-content" key={location.pathname}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/game/new" element={<SetupPage />} />
                <Route path="/game/play" element={<Play />} />
                <Route path="/game/results" element={<Results />} />
                <Route path="/categories" element={<Categories />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/admin/categories/:id" element={<AdminCategory />} />
                <Route
                  path="*"
                  element={
                    <Empty
                      title="Por aquí no era."
                      description="Esta página no existe. La próxima partida sí puede existir."
                    />
                  }
                />
              </Routes>
            </div>
          </>
        )}
      </main>
      <footer className="app-footer">
        <span>NO ESCUCHES.</span>
        <span>Un juego para gente con malas ideas.</span>
        <span>Solo en este navegador</span>
      </footer>
    </>
  );
}
