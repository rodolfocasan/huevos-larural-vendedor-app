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




## Compilación de proyecto
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