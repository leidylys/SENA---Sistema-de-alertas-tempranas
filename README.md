# SENA – Sistema de Alertas Tempranas

Plataforma institucional de retención pedagógica y académica del Servicio Nacional de Aprendizaje (SENA). Esta herramienta ha sido diseñada para detectar tempranamente a los aprendices en riesgo de deserción mediante el análisis inteligente de archivos de seguimiento de aprendizajes y calificaciones provenientes de sistemas LMS (como SOFÍA Plus o Blackboard) y la persistencia segura de datos de seguimiento y planes de mejoramiento estratégico.

> ⚠️ **Nota Importante:** Este proyecto se encuentra actualmente en **versión prototipo comercial / funcional**. Todas las integraciones y flujos de trabajo están optimizados para el modelado de alertas y la simulación académica real.

---

## 🎯 Objetivo General del Sistema

El principal objetivo de este sistema es mitigar la deserción de los aprendices en los programas de formación tecnológica y técnica del SENA, permitiendo a los instructores y administradores:
1. **Analizar y Parsear Reportes LMS:** Cargar hojas de cálculo de reportes de notas y accesos directamente en formato Excel.
2. **Clasificar el Nivel de Riesgo:** Calcular puntajes de riesgo automáticos basados en fórmulas institucionales optimizadas (retraso de evidencias, días sin ingreso a la plataforma, calificaciones bajas).
3. **Generar Planes de Acción Personalizados:** Proporcionar estrategias de recuperación personalizadas utilizando el poder del motor de inteligencia artificial de Gemini API.
4. **Registro de Seguimiento Histórico:** Almacenar de manera duradera y segura las intervenciones y compromisos de los aprendices de cara a la retención estudiantil.
5. **Gestión de Fichas y Asignaciones:** Permitir a los administradores mapear instructores a sus respectivas fichas técnicas de manera ágil.

---

## 🛠️ Tecnologías Utilizadas

El sistema está estructurado bajo una arquitectura de pila completa (Full-Stack) y moderna sobre las siguientes tecnologías:

- **Frontend (SPA):** React 19, TypeScript y Vite.
- **Diseño y Estructuración de UI:** Tailwind CSS v4 para un diseño responsivo alineado a la identidad corporativa y colores institucionales del SENA. Recharts y Lucide Icons para widgets y analítica visual.
- **Backend (Servidor Seguro):** Express para rutas API protegidas, proxy seguro hacia servicios de terceros, y carga estática segura del bundle.
- **Base de Datos y Persistencia:** Cloud SQL (PostgreSQL) integrado de manera ágil y segura utilizando **Drizzle ORM** para la gestión y definición esquemática relacional.
- **Autenticación:** Firebase Authentication para autenticación web con opción de login federado seguro (Google e institucional MiSena) y bypass para demos locales.
- **Inteligencia Artificial:** Gemini API (`@google/genai`) para la estructuración y recomendación inteligente de estrategias de intervención y reportes.

---

## 📋 Requisitos de Instalación

Para ejecutar este proyecto de forma local en su entorno de desarrollo, asegúrese de tener instalados los siguientes componentes:

* **Node.js** (Versión 18.x o superior recomendada)
* **npm** (Versión 9.x o superior)
* Una instancia activa de base de datos **PostgreSQL** o acceso de red a Cloud SQL.
* Cuenta y credenciales de **Firebase** para configurar la autenticación del cliente.
* Una clave API activa para **Gemini AI**.

---

## ⚙️ Variables de Entorno Necesarias (.env)

Cree un archivo `.env` en la raíz del proyecto similar a `.env.example` con la siguiente información de configuración:

```env
# Clave del motor de Inteligencia Artificial Gemini
GEMINI_API_KEY="SU_GEMINI_API_KEY"

# URL Base de host de la aplicación móvil / web
APP_URL="http://localhost:3000"

# Credenciales de conexión a Base de Datos Relacional PostgreSQL / Cloud SQL
SQL_HOST="localhost"
SQL_DB_NAME="sena_alertas_db"
SQL_USER="postgres"
SQL_PASSWORD="su_password"

# Credenciales del Administrador de Base de Datos para migraciones (Drizzle-Kit)
SQL_ADMIN_USER="postgres"
SQL_ADMIN_PASSWORD="su_password"
```

---

## 🚀 Comandos de Inicialización y Desarrollo

Siga las siguientes instrucciones del ciclo de construcción en la consola de comandos de su directorio de trabajo:

### 1. Instalar Dependencias del Proyecto
Descarga e instala de manera robusta todos los paquetes enumerados en el archivo manifest `package.json`:
```bash
npm install
```

### 2. Ejecutar Base de Datos (Si aplica)
Si está configurando el esquema en su base de datos local mediante Drizzle, ejecute opcionalmente las migraciones de base de datos para generar la estructura esquemática física (`aprendices_fichas`, `fichas`, `instructores`, `programas_formacion`, etc.):
```bash
npx drizzle-kit push
```

### 3. Iniciar el Servidor de Desarrollo
Arranque el servidor de backend en modo desarrollo que, a su vez, monta el entorno Vite interactivo en el puerto por defecto 3000:
```bash
npm run dev
```

Abra su navegador web favorito en [http://localhost:3000](http://localhost:3000) para interactuar y explorar el flujo institucional técnico del SENA.
