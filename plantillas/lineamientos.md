# Lineamientos del proyecto: {{PROYECTO}}

> Documento vivo. Lo crea el director con el usuario y lo mantiene el tech-writer.
> Lo marcado con (confirmar) debe validarlo el usuario.

## 1. Propósito del sistema
Qué problema resuelve y para quién. (confirmar)

## 2. Reglas de negocio
Reglas que el sistema siempre debe cumplir, en lenguaje simple.
- Ejemplo: "Nunca se emite una cotización sin precio de costo cargado." (confirmar)

## 3. Tecnologías
Lenguajes, frameworks, base de datos, hosting y servicios externos usados.
Qué NO se debe usar y por qué.

## 4. Estructura y convenciones
Cómo está organizado el código, cómo se nombran las cosas, estilo de código.
Territorio de cada rol del equipo (qué carpetas toca cada uno).

## 5. Metodología
- Desarrollo: TDD (prueba primero, luego implementación, luego orden).
- Ningún cambio se considera terminado si alguna prueba falla.
- Cómo se ejecutan las pruebas: {{COMANDOS}}

## 6. Seguridad y datos
Qué datos sensibles maneja el sistema y cómo se protegen.

## 6b. Puntos críticos, débiles y fuertes
- **Puntos críticos** (donde no puede fallar) y cómo debe comportarse si falla.
- **Puntos débiles** conocidos y qué los protege en el diseño.
- **Puntos fuertes** que todo cambio debe conservar.

## 7. Restricciones
Presupuesto, plazos, límites técnicos, compatibilidad necesaria.

## 8. Registro de decisiones
| Fecha | Decisión | Motivo | Quién decidió |
|---|---|---|---|
