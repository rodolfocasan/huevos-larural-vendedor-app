// index.js
import { registerRootComponent } from 'expo';

import App from './App';





// registerRootComponent llama a AppRegistry.registerComponent('main', () => App);
// También asegura que, ya sea que cargues la aplicación en Expo Go o en una compilación nativa,
// el entorno esté configurado adecuadamente.
registerRootComponent(App);