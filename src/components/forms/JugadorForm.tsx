import {
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import {
  jugadoresApi,
  validarCedulaJugador,
} from '../../api/jugadoresApi';
import {
  uploadJugadorDocumento,
  uploadJugadorFoto,
} from '../../api/uploadsApi';
import { useAuth } from '../../hooks/useAuth';
import { useDelegadoClubes } from '../../hooks/useDelegadoClubes';
import type {
  CedulaJugadorValidacion,
  Club,
  Jugador,
  JugadorPayload,
  JugadorUpdatePayload,
} from '../../types';
import { getApiErrorMessage } from '../../utils/apiError';
import { getAssetUrl } from '../../utils/assetUrl';
import { Button } from '../ui/Button';
import { ErrorMessage } from '../ui/ErrorMessage';
import { FormInput } from '../ui/FormInput';
import { FormSelect } from '../ui/FormSelect';

const emptyForm = {
  id_club: '',
  cedula: '',
  nombres: '',
  apellidos: '',
  fecha_nacimiento: '',
  lugar_nacimiento: '',
  genero: '',
  foto_url: '',
  documento_identidad_url: '',
  observacion_validacion: '',
};

const emptyCedulaStatus = {
  loading: false,
  valida: null,
  existe: null,
  mensaje: '',
  jugador: null,
  club: null,
};

interface JugadorFormProps {
  clubes: Club[];
  jugador?: Jugador | null;
  onCancel: () => void;
  onSaved: (jugador: Jugador, message: string) => void;
  selectedClubId?: number | null;
  selectedClubName?: string;
  loadingClubes?: boolean;
}

export function JugadorForm({
  clubes,
  jugador = null,
  onCancel,
  onSaved,
  selectedClubId = null,
  selectedClubName = '',
  loadingClubes = false,
}: JugadorFormProps) {
  const { user } = useAuth();
  const isEditing = Boolean(jugador?.id_jugador);
  const role = user?.rol?.nombre_rol;
  const isDelegado = role === 'DELEGADO';
  const isSecretaria = role === 'SECRETARIA';
  const isAdmin = role === 'ADMINISTRADOR';
  const canOpenForm = isEditing
    ? isAdmin || isSecretaria || isDelegado
    : isAdmin || isDelegado;
  const [form, setForm] = useState(emptyForm);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [documentoFile, setDocumentoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [permissionError, setPermissionError] = useState('');
  const [cedulaStatus, setCedulaStatus] = useState<{
    loading: boolean;
    valida: boolean | null;
    existe: boolean | null;
    mensaje: string;
    jugador?: CedulaJugadorValidacion['jugador'];
    club?: CedulaJugadorValidacion['club'];
  }>(emptyCedulaStatus);
  const {
    selectedClub: hookSelectedClub,
    selectedClubId: hookSelectedClubId,
    selectedClubName: hookSelectedClubName,
    loadingClubes: hookLoadingClubes,
  } = useDelegadoClubes(user ?? null, isDelegado);
  const delegadoSelectedClub = isDelegado ? hookSelectedClub : null;
  const delegadoSelectedClubId = isDelegado
    ? hookSelectedClubId
    : selectedClubId;
  const delegadoSelectedClubName = isDelegado
    ? hookSelectedClubName
    : selectedClubName;
  const delegadoLoadingClubes = isDelegado
    ? hookLoadingClubes
    : loadingClubes;

  useEffect(() => {
    setError('');
    setPermissionError('');
    setFotoFile(null);
    setDocumentoFile(null);

    if (jugador) {
      if (
        isDelegado &&
        !['PENDIENTE_VALIDACION', 'OBSERVADO'].includes(
          jugador.estado_jugador,
        )
      ) {
        setPermissionError(
          `No puede editar un jugador ${jugador.estado_jugador
            .toLowerCase()
            .replace(/_/g, ' ')}.`,
        );
      }

      setForm({
        id_club: String(jugador.id_club),
        cedula: jugador.cedula,
        nombres: jugador.nombres,
        apellidos: jugador.apellidos,
        fecha_nacimiento: jugador.fecha_nacimiento,
        lugar_nacimiento: jugador.lugar_nacimiento ?? '',
        genero: jugador.genero ?? '',
        foto_url: jugador.foto_url ?? '',
        documento_identidad_url: jugador.documento_identidad_url ?? '',
        observacion_validacion: jugador.observacion_validacion ?? '',
      });
      setCedulaStatus({
        loading: false,
        valida: true,
        existe: false,
        jugador: null,
        club: null,
        mensaje: 'Cédula válida y disponible.',
      });
      setFotoPreview(getAssetUrl(jugador.foto_url));
      return;
    }

    setForm({
      ...emptyForm,
      id_club: isDelegado
        ? delegadoSelectedClubId
          ? String(delegadoSelectedClubId)
          : ''
        : clubes.length === 1
          ? String(clubes[0].id_club)
          : '',
    });
    setCedulaStatus(emptyCedulaStatus);
    setFotoPreview('');
  }, [clubes, delegadoSelectedClubId, isDelegado, jugador]);

  const cedulaOriginal = jugador?.cedula ?? '';
  const cedulaSinCambios = isEditing && form.cedula === cedulaOriginal;

  useEffect(() => {
    const cedula = form.cedula;

    if (cedulaSinCambios && cedula.length === 10) {
      setCedulaStatus({
        loading: false,
        valida: true,
        existe: false,
        mensaje: 'Cédula válida y disponible.',
      });
      return;
    }

    if (!cedula || cedula.length !== 10) {
      setCedulaStatus((current) => ({
        ...current,
        loading: false,
        valida: null,
        existe: null,
        mensaje: cedula.length === 0 || cedula.length < 10 ? '' : current.mensaje,
        jugador: null,
        club: null,
      }));
      return;
    }

    let cancelled = false;

    const validate = async () => {
      try {
        setCedulaStatus({
          loading: true,
          valida: null,
          existe: null,
          jugador: null,
          club: null,
          mensaje: 'Validando cédula...',
        });

        const result = await validarCedulaJugador(
          cedula,
          jugador?.id_jugador,
        );

        if (cancelled) return;

        setCedulaStatus({
          loading: false,
          valida: result.valida,
          existe: result.existe,
          jugador: result.jugador ?? null,
          club: result.club ?? null,
          mensaje: result.valida
            ? result.existe
              ? 'La cédula ya está registrada.'
              : 'Cédula válida y disponible.'
            : 'La cédula ecuatoriana no es válida.',
        });
      } catch {
        if (cancelled) return;

        setCedulaStatus({
          loading: false,
          valida: false,
          existe: null,
          mensaje: 'No se pudo validar la cédula.',
        });
      }
    };

    const timeout = window.setTimeout(() => {
      void validate();
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [cedulaSinCambios, form.cedula, jugador?.id_jugador]);

  const handleCedulaChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value.replace(/\D/g, '').slice(0, 10);

    setForm((current) => ({
      ...current,
      cedula: value,
    }));

    setCedulaStatus({
      loading: false,
      valida: null,
      existe: null,
      mensaje: '',
    });
  };

  const cedulaInvalida =
    !cedulaSinCambios &&
    (form.cedula.length !== 10 ||
      cedulaStatus.loading ||
      cedulaStatus.valida !== true ||
      cedulaStatus.existe === true);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!canOpenForm || permissionError) {
      return;
    }

    if (
      form.cedula.length !== 10 ||
      (!cedulaSinCambios &&
        (cedulaStatus.loading ||
          cedulaStatus.valida !== true ||
          cedulaStatus.existe === true))
    ) {
      setError('Debe ingresar una cédula ecuatoriana válida y no registrada.');
      return;
    }

    if (cedulaStatus.existe === true) {
      setError('La cédula ya está registrada.');
      return;
    }

    if (isDelegado && !delegadoSelectedClubId) {
      setError('No tienes un club asignado.');
      return;
    }

    setIsSubmitting(true);

    try {
      let fotoUrl = form.foto_url || null;
      let documentoUrl = form.documento_identidad_url || null;

      if (!isSecretaria && fotoFile) {
        fotoUrl = (await uploadJugadorFoto(fotoFile)).url;
      }
      if (!isSecretaria && documentoFile) {
        documentoUrl = (await uploadJugadorDocumento(documentoFile)).url;
      }

      let saved: Jugador;

      if (isEditing && jugador?.id_jugador) {
        const payload: JugadorUpdatePayload = {
          nombres: form.nombres.trim(),
          apellidos: form.apellidos.trim(),
          nombre_completo: `${form.nombres} ${form.apellidos}`.trim(),
          fecha_nacimiento: form.fecha_nacimiento,
          lugar_nacimiento: form.lugar_nacimiento.trim() || null,
          genero: form.genero || null,
        };

        if (isDelegado) {
          payload.cedula = form.cedula.trim();
          payload.foto_url = fotoUrl;
          payload.documento_identidad_url = documentoUrl;
        } else if (isSecretaria) {
          payload.observacion_validacion =
            form.observacion_validacion.trim() || null;
        } else if (isAdmin) {
          payload.id_club = Number(form.id_club);
          payload.cedula = form.cedula.trim();
          payload.foto_url = fotoUrl;
          payload.documento_identidad_url = documentoUrl;
          payload.observacion_validacion =
            form.observacion_validacion.trim() || null;
        }

        saved = await jugadoresApi.actualizar(jugador.id_jugador, payload);
      } else {
        const payload: JugadorPayload = {
          id_club: isDelegado
            ? Number(delegadoSelectedClubId)
            : Number(form.id_club),
          cedula: form.cedula.trim(),
          nombres: form.nombres.trim(),
          apellidos: form.apellidos.trim(),
          nombre_completo: `${form.nombres} ${form.apellidos}`.trim(),
          fecha_nacimiento: form.fecha_nacimiento,
          lugar_nacimiento: form.lugar_nacimiento.trim() || null,
          genero: form.genero || null,
          foto_url: fotoUrl,
          documento_identidad_url: documentoUrl,
        };
        saved = await jugadoresApi.crear(payload);
      }

      onSaved(
        saved,
        isDelegado && jugador?.estado_jugador === 'OBSERVADO'
          ? 'La corrección fue enviada nuevamente a validación.'
          : `Jugador ${isEditing ? 'actualizado' : 'registrado'} correctamente.`,
      );
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          'No se pudo guardar el jugador. Verifica que la cédula no esté registrada.',
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const formSelectedClub = clubes.find(
    (club) => club.id_club === Number(form.id_club),
  );
  const clubAsignadoLabel = delegadoLoadingClubes
    ? 'Cargando club asignado...'
    : delegadoSelectedClubName ||
      delegadoSelectedClub?.nombre_club ||
      delegadoSelectedClub?.raw?.club?.nombre_club ||
      delegadoSelectedClub?.raw?.nombre_club ||
      'Sin club asignado';
  const showClubSelect = !isSecretaria && !isDelegado;
  const showUploads = !isSecretaria;
  const delegateWithoutClub =
    isDelegado && !delegadoLoadingClubes && !delegadoSelectedClubId;

  if (!canOpenForm || permissionError) {
    return (
      <ErrorMessage
        message={
          permissionError || 'No tienes permisos para acceder a este módulo.'
        }
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {isDelegado ? (
          <FormInput
            label="Club asignado"
            value={clubAsignadoLabel}
            readOnly
          />
        ) : isSecretaria ? (
          <FormInput
            label="Club"
            value={formSelectedClub?.nombre_club ?? ''}
            readOnly
          />
        ) : showClubSelect ? (
          <FormSelect
            label="Club"
            value={form.id_club}
            required
            options={clubes.map((club) => ({
              value: String(club.id_club),
              label: club.nombre_club,
            }))}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                id_club: event.target.value,
              }))
            }
          />
        ) : (
          <FormSelect
            label="Club"
            value={form.id_club}
            required
            options={clubes.map((club) => ({
              value: String(club.id_club),
              label: club.nombre_club,
            }))}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                id_club: event.target.value,
              }))
            }
          />
        )}

        <div>
          <FormInput
            label="Cédula"
            type="text"
            inputMode="numeric"
            maxLength={10}
            placeholder="Ej: 0106519291"
            value={form.cedula}
            required
            readOnly={isSecretaria}
            onChange={handleCedulaChange}
          />
          {cedulaStatus.mensaje ? (
            <div
              className={`mt-1 text-xs ${
                cedulaStatus.loading
                  ? 'text-slate-500'
                  : cedulaStatus.valida === true &&
                      cedulaStatus.existe === false
                    ? 'text-green-700'
                    : cedulaStatus.valida === false ||
                        cedulaStatus.existe === true
                      ? 'text-red-600'
                      : 'text-slate-500'
              }`}
            >
              <p>{cedulaStatus.mensaje}</p>
              {cedulaStatus.existe === true &&
              (cedulaStatus.jugador || cedulaStatus.club) ? (
                <div className="mt-1 space-y-0.5">
                  {cedulaStatus.jugador?.nombre_completo ? (
                    <p>Jugador: {cedulaStatus.jugador.nombre_completo}</p>
                  ) : null}
                  {cedulaStatus.club?.nombre_club ? (
                    <p>Club: {cedulaStatus.club.nombre_club}</p>
                  ) : null}
                  {cedulaStatus.jugador?.estado_jugador ? (
                    <p>Estado: {cedulaStatus.jugador.estado_jugador}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <FormInput
          label="Nombres"
          value={form.nombres}
          required
          onChange={(event) =>
            setForm((current) => ({ ...current, nombres: event.target.value }))
          }
        />
        <FormInput
          label="Apellidos"
          value={form.apellidos}
          required
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              apellidos: event.target.value,
            }))
          }
        />
        <FormInput
          label="Fecha de nacimiento"
          type="date"
          value={form.fecha_nacimiento}
          required
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              fecha_nacimiento: event.target.value,
            }))
          }
        />
        <FormInput
          label="Lugar de nacimiento"
          value={form.lugar_nacimiento}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              lugar_nacimiento: event.target.value,
            }))
          }
        />
        <FormSelect
          label="Género"
          value={form.genero}
          options={[
            { value: 'MASCULINO', label: 'Masculino' },
            { value: 'FEMENINO', label: 'Femenino' },
            { value: 'OTRO', label: 'Otro' },
          ]}
          onChange={(event) =>
            setForm((current) => ({ ...current, genero: event.target.value }))
          }
        />

        {isSecretaria || isAdmin ? (
          <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
            Observación de validación
            <textarea
              value={form.observacion_validacion}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  observacion_validacion: event.target.value,
                }))
              }
              className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            />
          </label>
        ) : null}

        {showUploads ? (
          <>
            <label className="block text-sm font-medium text-slate-700">
              Foto del jugador
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setFotoFile(file);
                  if (file) {
                    setFotoPreview(URL.createObjectURL(file));
                  }
                }}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              {fotoPreview ? (
                <img
                  src={fotoPreview}
                  alt="Vista previa del jugador"
                  className="mt-3 h-24 w-24 rounded-lg border border-slate-200 object-cover"
                />
              ) : null}
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Documento de identidad
              <input
                type="file"
                accept="application/pdf,image/png,image/jpeg,image/jpg,image/webp"
                onChange={(event) =>
                  setDocumentoFile(event.target.files?.[0] ?? null)
                }
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              {documentoFile ? (
                <span className="mt-2 block text-xs text-slate-600">
                  {documentoFile.name}
                </span>
              ) : form.documento_identidad_url ? (
                <a
                  href={getAssetUrl(form.documento_identidad_url)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 block text-xs font-semibold text-blue-700"
                >
                  Ver documento actual
                </a>
              ) : null}
            </label>
          </>
        ) : (
          <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
            <p className="text-sm font-semibold text-slate-700">
              Archivos actuales
            </p>
            {fotoPreview ? (
              <img
                src={fotoPreview}
                alt="Foto actual"
                className="h-24 w-24 rounded-lg border border-slate-200 object-cover"
              />
            ) : (
              <p className="text-sm text-slate-500">Sin foto.</p>
            )}
            {form.documento_identidad_url ? (
              <a
                href={getAssetUrl(form.documento_identidad_url)}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-semibold text-blue-700"
              >
                Ver documento actual
              </a>
            ) : (
              <p className="text-sm text-slate-500">Sin documento.</p>
            )}
          </div>
        )}
      </div>

      {delegateWithoutClub ? (
        <ErrorMessage message="No tienes un club asignado. No puedes registrar jugadores." />
      ) : clubes.length === 0 && !isDelegado ? (
        <ErrorMessage message="No hay clubes disponibles para este jugador." />
      ) : null}
      {error ? <ErrorMessage message={error} /> : null}

      <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-300"
        >
          Cancelar
        </button>
        <Button
          type="submit"
          disabled={
            isSubmitting ||
            delegadoLoadingClubes ||
            delegateWithoutClub ||
            (!isDelegado && clubes.length === 0) ||
            cedulaInvalida
          }
        >
          {isSubmitting ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>
    </form>
  );
}
