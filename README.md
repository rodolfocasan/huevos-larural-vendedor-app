# Huevos La Rural - Vendedor App
Es una aplicación desarrollada para los vendedores de Huevos La Rural, diseñada para facilitar el conteo y la administración de ventas de cada vendedor. Esta herramienta permite a los vendedores gestionar sus transacciones de manera eficiente y precisa.





## Instalación de dependencias
- Clonación de proyecto:
```bash
git clone https://github.com/rodolfocasan/huevos-larural-vendedor-app.git
```
```bash
cd huevos-larural-vendedor-app
```

- Instalación de dependencias:
```bash
npm install
```

- Ejecutar proyecto en modo desarrollo:
```bash
npx expo start
```





## Compilación de proyecto (Usando Expo)
- Instalación de EAS:
```bash
npm install -g eas-cli
```

- Iniciar sesión con Expo Account:
```bash
eas login
```

- Inicializar configuración de EAS en el proyecto:
```bash
eas build:configure
```

- Compilar el proyecto en .APK (usando los servidores de Expo):
```bash
eas build --platform android --profile preview
```

- Compilar el proyecto en .AAB (usando los servidores de Expo):
```bash
eas build --platform android
```





## Compilación de proyecto (Localmente)
- Instalación de EAS:
```bash
npm install -g eas-cli
```

- Iniciar sesión con Expo Account:
```bash
eas login
```

- Inicializar configuración de EAS en el proyecto:
```bash
eas build:configure
```

- Convertir Expo Managed a un proyecto React Native nativo (bare workflow):
```bash
npx expo prebuild --platform android
```

El comando anterior deberá generar la carpeta 'android', esta debe ser abierta desde Android Studio para poder trabajar con ella (compilar en .aab, .apk, etc).





## Aclaraciones sobre API Keys
Este proyecto utiliza una API Key de Google Maps para habilitar funcionalidades de mapas a través de la biblioteca ```react-native-maps```. La clave API está configurada en el archivo ```app.json``` y es necesaria para que la aplicación funcione correctamente con los servicios de Google Maps.

**Importante**: La API Key proporcionada en este repositorio está restringida específicamente para funcionar solo con esta aplicación. Las restricciones aplicadas incluyen:

- Firma SHA-1: La clave solo funcionará con la firma única generada por el keystore utilizado para firmar la aplicación Android.
- Número de paquete: La clave está vinculada al paquete específico de la aplicación, lo que garantiza que solo esta aplicación pueda utilizarla.

Gracias a estas restricciones, aunque la clave API esté visible en el código fuente, no puede ser utilizada en otros proyectos o aplicaciones. Esto asegura que no haya riesgo de uso no autorizado o abuso de la clave.

**Nota**: Como buena práctica de seguridad, generalmente no se recomienda exponer claves API en repositorios públicos. Sin embargo, en este caso, debido a las restricciones aplicadas, la clave está protegida y solo funcionará con esta aplicación específica. Si deseas utilizar tu propia clave API, puedes reemplazarla en el archivo ```app.json``` y configurarla en la consola de Google Cloud con tus propias restricciones.
