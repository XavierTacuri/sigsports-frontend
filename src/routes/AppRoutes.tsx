import { Navigate, Route, Routes } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { LoginPage } from '../pages/auth/LoginPage';
import { CampeonatosPage } from '../pages/campeonatos/CampeonatosPage';
import { CategoriasPage } from '../pages/categorias/CategoriasPage';
import { ClubesPage } from '../pages/clubes/ClubesPage';
import { CompetenciasPage } from '../pages/competencias/CompetenciasPage';
import { CalendarioPage } from '../pages/calendario/CalendarioPage';
import { EscenariosPage } from '../pages/calendario/EscenariosPage';
import { PartidosPage } from '../pages/calendario/PartidosPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { DeportesPage } from '../pages/deportes/DeportesPage';
import { InscripcionDetailPage } from '../pages/inscripciones/InscripcionDetailPage';
import { InscripcionesPage } from '../pages/inscripciones/InscripcionesPage';
import { NuevaInscripcionPage } from '../pages/inscripciones/NuevaInscripcionPage';
import { JugadorDetailPage } from '../pages/jugadores/JugadorDetailPage';
import { JugadorFormPage } from '../pages/jugadores/JugadorFormPage';
import { JugadoresPage } from '../pages/jugadores/JugadoresPage';
import { ValidacionJugadoresPage } from '../pages/jugadores/ValidacionJugadoresPage';
import { NuevaSolicitudPasePage } from '../pages/pases/NuevaSolicitudPasePage';
import { SolicitudPaseDetailPage } from '../pages/pases/SolicitudPaseDetailPage';
import { SolicitudesPasesPage } from '../pages/pases/SolicitudesPasesPage';
import { PlanillaDetallePage } from '../pages/planillas/PlanillaDetallePage';
import { PlanillasPage } from '../pages/planillas/PlanillasPage';
import { EstadisticasPage } from '../pages/estadisticas/EstadisticasPage';
import { EventoIndividualDetallePage } from '../pages/eventosIndividuales/EventoIndividualDetallePage';
import { EventosIndividualesPage } from '../pages/eventosIndividuales/EventosIndividualesPage';
import { ReportesPage } from '../pages/reportes/ReportesPage';
import { SancionesPage } from '../pages/sanciones/SancionesPage';
import { PlaceholderPage } from '../pages/PlaceholderPage';
import { UsuariosPage } from '../pages/usuarios/UsuariosPage';
import { UsuariosClubesPage } from '../pages/usuariosClubes/UsuariosClubesPage';
import { ProtectedRoute } from './ProtectedRoute';

const moduleRoutes = [
  '/validaciones',
];

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/usuarios" element={<UsuariosPage />} />
          <Route path="/clubes" element={<ClubesPage />} />
          <Route path="/deportes" element={<DeportesPage />} />
          <Route path="/categorias" element={<CategoriasPage />} />
          <Route path="/campeonatos" element={<CampeonatosPage />} />
          <Route path="/competencias" element={<CompetenciasPage />} />
          <Route path="/calendario" element={<CalendarioPage />} />
          <Route path="/escenarios" element={<EscenariosPage />} />
          <Route path="/partidos" element={<PartidosPage />} />
          <Route
            path="/eventos-individuales"
            element={<EventosIndividualesPage />}
          />
          <Route
            path="/eventos-individuales/:id"
            element={<EventoIndividualDetallePage />}
          />
          <Route path="/planillas" element={<PlanillasPage />} />
          <Route path="/estadisticas" element={<EstadisticasPage />} />
          <Route path="/reportes" element={<ReportesPage />} />
          <Route
            path="/tabla-posiciones"
            element={<EstadisticasPage initialTab="tabla" />}
          />
          <Route
            path="/goleadores"
            element={<EstadisticasPage initialTab="goleadores" />}
          />
          <Route path="/sanciones" element={<SancionesPage />} />
          <Route path="/planillas/:id" element={<PlanillaDetallePage />} />
          <Route
            path="/planillas/partido/:idPartido"
            element={<PlanillaDetallePage />}
          />
          <Route
            path="/partidos/:idPartido/planilla"
            element={<PlanillaDetallePage />}
          />
          <Route path="/inscripciones" element={<InscripcionesPage />} />
          <Route
            path="/inscripciones/nueva"
            element={<NuevaInscripcionPage />}
          />
          <Route
            path="/inscripciones/:id"
            element={<InscripcionDetailPage />}
          />
          <Route path="/usuarios-clubes" element={<UsuariosClubesPage />} />
          <Route path="/jugadores" element={<JugadoresPage />} />
          <Route path="/jugadores/nuevo" element={<JugadorFormPage />} />
          <Route path="/jugadores/:id" element={<JugadorDetailPage />} />
          <Route path="/jugadores/:id/editar" element={<JugadorFormPage />} />
          <Route path="/pases" element={<SolicitudesPasesPage />} />
          <Route
            path="/pases/nueva"
            element={<NuevaSolicitudPasePage />}
          />
          <Route
            path="/pases/:id"
            element={<SolicitudPaseDetailPage />}
          />
          <Route
            path="/validacion-jugadores"
            element={<ValidacionJugadoresPage />}
          />
          {moduleRoutes.map((path) => (
            <Route key={path} path={path} element={<PlaceholderPage />} />
          ))}
        </Route>
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
