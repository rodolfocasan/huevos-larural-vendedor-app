// Components/Utils/Constants.js





// Esquema de colores de la aplicación - Tema oscuro
export const COLORS = {
    primary: '#2E3A59',       // Azul oscuro
    secondary: '#FF9800',     // Naranja para resaltes
    accent: '#4D7CFE',        // Azul para elementos importantes
    background: '#121212',    // Fondo oscuro
    card: '#1E1E1E',          // Ligeramente más claro que el fondo para tarjetas
    text: '#FFFFFF',          // Texto blanco
    textSecondary: '#B0B0B0', // Texto gris claro
    border: '#303030',        // Color de borde
    success: '#4CAF50',       // Verde para estados de éxito
    error: '#F44336',         // Rojo para errores
    warning: '#FFC107',       // Amarillo para advertencias
};

// Formatea la hora en formato AM/PM
export const formatTime = (date) => {
    const d = new Date(date);
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const seconds = d.getSeconds().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';

    hours = hours % 12;
    hours = hours ? hours : 12; // la hora '0' debe ser '12'

    return `${hours}:${minutes}:${seconds} ${ampm}`;
};

// Formatea la fecha para su visualización
export const formatDate = (date) => {
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();

    return `${day}/${month}/${year}`;
};

// Denominaciones de billetes disponibles
export const BILLS = [1, 5, 10, 20, 50, 100];

// Tipos de gastos comunes
export const EXPENSE_TYPES = [
    'Gasolina',
    'Comida',
    'Transporte',
    'Mantenimiento',
    'Otro'
];