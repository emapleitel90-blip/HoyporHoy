/**
 * Middleware global de manejo de errores.
 * Evita que stack traces o datos sensibles (PII) se expongan al cliente.
 * Debe registrarse como el ÚLTIMO app.use() en index.js.
 */
export const errorHandler = (err, req, res, next) => {
    // Loguear internamente el error completo (solo en server)
    console.error(`[ERROR] ${req.method} ${req.url}`, {
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : '(oculto en producción)',
    });

    const statusCode = err.statusCode || 500;

    // Mensaje seguro — nunca exponer el stack ni detalles internos al cliente
    const clientMessage =
        err.isOperational
            ? err.message  // Errores de negocio que queremos mostrar
            : 'Ocurrió un error interno. Por favor, intente más tarde.';

    res.status(statusCode).json({
        success: false,
        message: clientMessage,
    });
};

/**
 * Helper para lanzar errores operacionales (ej. validación de negocio)
 * sin exponer internals del servidor.
 */
export class AppError extends Error {
    constructor(message, statusCode = 400) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
    }
}
