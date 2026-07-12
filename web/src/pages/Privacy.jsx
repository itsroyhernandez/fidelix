import { useEffect } from "react";

function useOverlayLock(onClose) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);
}

// Politica de privacidad y tratamiento de datos (overlay).
export default function Privacy({ onClose }) {
  useOverlayLock(onClose);
  return (
    <div className="overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="overlay-body policy" onClick={(e) => e.stopPropagation()}>
        <div className="row between">
          <h3>Política de Privacidad y Datos</h3>
          <button className="btn ghost sm" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>
        <p className="muted tiny">Fidelix by Movix · última actualización: 2026</p>

        <h4>1. Quiénes somos</h4>
        <p className="muted">
          Fidelix es una plataforma de programas de lealtad operada por <b>Movix</b> (el
          "Desarrollador"). Cada negocio que contrata Fidelix (el "Comercio") administra su propio
          programa y sus clientes finales.
        </p>

        <h4>2. Qué datos recopilamos</h4>
        <p className="muted">
          Nombre, correo electrónico, contraseña (cifrada), y la actividad de lealtad (sellos,
          puntos, canjes). Para Comercios: nombre de la marca, datos de contacto y de facturación.
        </p>

        <h4>3. Cómo se usan</h4>
        <p className="muted">
          Para operar el programa de recompensas, verificar identidad por código, generar
          estadísticas y enviar reportes mensuales al Comercio.
        </p>

        <h4>4. Compartición de datos</h4>
        <p className="muted">
          Los datos de un cliente final pueden ser <b>compartidos con el Comercio</b> en el que se
          inscribió (es su relación comercial) y con <b>proveedores de servicio</b> necesarios para
          operar Fidelix (alojamiento, correo, procesadores de pago como PayPal o Stripe, y
          servicios de billetera de Apple/Google). No vendemos datos personales a terceros. Podremos
          divulgar información cuando la ley lo exija.
        </p>

        <h4>5. Aislamiento y seguridad</h4>
        <p className="muted">
          Cada marca está aislada: un Comercio no ve los datos de otro. Aplicamos cifrado de
          contraseñas, autenticación por token, control por roles, límites de tasa y validación de
          entradas. Ningún sistema es 100% infalible, pero seguimos estándares de la industria (OWASP).
        </p>

        <h4>6. Tus derechos</h4>
        <p className="muted">
          Podés solicitar acceso, corrección o eliminación de tus datos escribiendo a
          soporte@movix.com. Al usar Fidelix aceptás esta política.
        </p>
      </div>
    </div>
  );
}
