// Components/Home/RouteManager.js
import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Modal,
    TextInput,
    Alert,
    ActivityIndicator,
    Dimensions,
    Button,
    Image
} from "react-native";
import * as Location from "expo-location";
import MapView, { Marker, Polyline, UrlTile } from 'react-native-maps';
import * as FileSystem from 'expo-file-system';
import { CameraView, CameraType, Camera } from 'expo-camera';
import NetInfo from '@react-native-community/netinfo';

import { COLORS, formatTime, formatDate } from "../Utils/Constants";





// Constantes para la gestión de tiles
const TILE_FOLDER = `${FileSystem.documentDirectory}tiles`;
const ONLINE_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OFFLINE_TILE_URL = `file://${TILE_FOLDER}/{z}/{x}/{y}.png`;

// Componente para gestionar la ruta de ventas y clientes
const { width, height } = Dimensions.get("window");

const RouteManager = ({ sale, updateSale, eggsPrice }) => {
    // Estados para la gestión de clientes
    const [activeClientTab, setActiveClientTab] = useState("confirmed"); // 'confirmed' o 'pending'
    const [clientModalVisible, setClientModalVisible] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingClient, setEditingClient] = useState(null);
    const [locationPermission, setLocationPermission] = useState(null);
    const [currentLocation, setCurrentLocation] = useState(null);
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);
    const [showMap, setShowMap] = useState(false);
    const [gpsEnabled, setGpsEnabled] = useState(false);
    const [manualLocationModalVisible, setManualLocationModalVisible] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState(null);

    // Estados para el mapa
    const [mapType, setMapType] = useState('standard');
    const [manualMapType, setManualMapType] = useState('standard');
    const [mapRegion, setMapRegion] = useState({
        latitude: 14.0723, // Coordenadas por defecto (El Salvador)
        longitude: -87.1921,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
    });
    const [userLocation, setUserLocation] = useState(null);
    const [hasInitializedMapRegion, setHasInitializedMapRegion] = useState(false);
    const [isTrackingLocation, setIsTrackingLocation] = useState(false);
    const [mapRef, setMapRef] = useState(null); // Agregar referencia al mapa

    // Estados del formulario de cliente
    const [clientForm, setClientForm] = useState({
        name: "",
        contact: "",
        quantity: "",
        location: null,
        address: "",
        status: "pending", // 'pending' o 'confirmed'
        photos: [], // Array de fotos en base64
    });

    // Estados para la cámara y fotos
    const [cameraVisible, setCameraVisible] = useState(false);
    const [cameraRef, setCameraRef] = useState(null);
    const [cameraPermission, setCameraPermission] = useState(null);
    const [capturedPhoto, setCapturedPhoto] = useState(null);
    const [photoConfirmVisible, setPhotoConfirmVisible] = useState(false);
    const [imageViewerVisible, setImageViewerVisible] = useState(false);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [viewingImages, setViewingImages] = useState([]);

    // Estados para la funcionalidad offline
    const [isOfflineMode, setIsOfflineMode] = useState(false); // Controla el modo online/offline
    const [isConnected, setIsConnected] = useState(true); // Estado de conectividad

    // Estados para la descarga offline
    const [offlineDownloadModalVisible, setOfflineDownloadModalVisible] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [downloadStatus, setDownloadStatus] = useState(''); // Estado textual
    const [totalTiles, setTotalTiles] = useState(0);
    const [downloadedTiles, setDownloadedTiles] = useState(0);

    // Verificación si la venta está cargada
    if (!sale) {
        return (
            <View style={styles.container}>
                <Text style={styles.loadingText}>Cargando ruta...</Text>
            </View>
        );
    }

    // Inicializar clientes si no existen
    const clients = sale.clients || [];
    const confirmedClients = clients.filter(
        (client) => client.status === "confirmed"
    );
    const pendingClients = clients.filter(
        (client) => client.status === "pending"
    );

    // Función para solicitar permisos de cámara
    const requestCameraPermissions = async () => {
        try {
            // Verificar el estado actual de los permisos
            const { status: existingStatus } = await Camera.getCameraPermissionsAsync();
            let finalStatus = existingStatus;

            // Si no se han concedido, solicitar permisos
            if (existingStatus !== 'granted') {
                const { status } = await Camera.requestCameraPermissionsAsync();
                finalStatus = status;
            }

            setCameraPermission(finalStatus === 'granted');

            if (finalStatus !== 'granted') {
                Alert.alert(
                    'Permisos requeridos',
                    'Se necesitan permisos de cámara para tomar fotos. Por favor, habilite los permisos en la configuración de su dispositivo.',
                    [
                        { text: 'OK', onPress: () => console.log('Permisos denegados') }
                    ]
                );
            }
        } catch (error) {
            console.error('Error al solicitar permisos de cámara:', error);
            Alert.alert('Error', 'No se pudieron solicitar los permisos de cámara.');
        }
    };

    // Verificar GPS y solicitar permisos de ubicación al cargar el componente
    useEffect(() => {
        checkGPSAndPermissions();
        requestCameraPermissions();

        // Suscribirse a cambios de conectividad
        const unsubscribe = NetInfo.addEventListener(state => {
            const connected = state.isConnected && state.isInternetReachable;
            setIsConnected(connected);
            setIsOfflineMode(!connected);
        });

        // Verificar conectividad inicial
        NetInfo.fetch().then(state => {
            const connected = state.isConnected && state.isInternetReachable;
            setIsConnected(connected);
            setIsOfflineMode(!connected);
        });

        return () => unsubscribe();
    }, []);

    // Efecto para rastrear la ubicación del usuario en tiempo real
    useEffect(() => {
        let locationSubscription = null;

        const startLocationTracking = async () => {
            if (locationPermission && isTrackingLocation) {
                try {
                    locationSubscription = await Location.watchPositionAsync(
                        {
                            accuracy: Location.Accuracy.High,
                            timeInterval: 5000, // Actualizar cada 5 segundos
                            distanceInterval: 10, // O cada 10 metros
                        },
                        (location) => {
                            const { latitude, longitude } = location.coords;
                            setUserLocation({ latitude, longitude });

                            // Actualizar región del mapa solo la primera vez
                            if (!hasInitializedMapRegion) {
                                setMapRegion({
                                    latitude,
                                    longitude,
                                    latitudeDelta: 0.01,
                                    longitudeDelta: 0.01,
                                });
                                setHasInitializedMapRegion(true);
                            }
                        }
                    );
                } catch (error) {
                    console.error("Error al rastrear ubicación:", error);
                }
            }
        };

        startLocationTracking();

        return () => {
            if (locationSubscription) {
                locationSubscription.remove();
            }
        };
    }, [locationPermission, isTrackingLocation, hasInitializedMapRegion]);

    // Función unificada para descargar tiles con progreso
    const downloadTilesWithProgress = async () => {
        // Verificar conectividad antes de descargar
        if (!isConnected) {
            Alert.alert("Error", "No hay conexión a internet. No se pueden descargar los mapas offline.");
            return;
        }

        try {
            setIsDownloading(true);
            setDownloadProgress(0);
            setDownloadedTiles(0);

            // Calcular tiles necesarios
            const currentZoom = calculateZoomLevel(mapRegion.longitudeDelta);
            const minZoom = Math.max(10, currentZoom - 2); // Zoom mínimo 10
            const maxZoom = Math.min(18, currentZoom + 2); // Zoom máximo 18
            const tiles = getTileGrid(mapRegion, minZoom, maxZoom);

            setTotalTiles(tiles.length);
            setDownloadStatus(`Preparando descarga de ${tiles.length} tiles...`);

            // Crear directorio principal si no existe
            const dirInfo = await FileSystem.getInfoAsync(TILE_FOLDER);
            if (!dirInfo.exists) {
                await FileSystem.makeDirectoryAsync(TILE_FOLDER, { intermediates: true });
            }

            // Descargar tiles uno por uno
            for (let i = 0; i < tiles.length; i++) {
                const tile = tiles[i];
                const progress = (i + 1) / tiles.length;

                setDownloadStatus(`Descargando tile ${i + 1} de ${tiles.length}...`);
                setDownloadProgress(progress);
                setDownloadedTiles(i + 1);

                try {
                    await downloadSingleTile(tile);
                } catch (tileError) {
                    console.warn(`Error descargando tile ${tile.z}/${tile.x}/${tile.y}:`, tileError);
                    // Continuar con el siguiente tile si uno falla
                }
            }

            setDownloadStatus('¡Descarga completada exitosamente!');
            setDownloadProgress(1);

            // Esperar un momento para mostrar el mensaje de éxito
            setTimeout(() => {
                setIsDownloading(false);
                setOfflineDownloadModalVisible(false);
                Alert.alert('Éxito', 'Mapas offline descargados correctamente.');
            }, 1500);

        } catch (error) {
            console.error('Error en descarga offline:', error);
            setDownloadStatus('Error en la descarga');
            setIsDownloading(false);
            Alert.alert('Error', 'No se pudieron descargar los mapas offline.');
        }
    };

    // Función para descargar un tile individual
    const downloadSingleTile = async (tile) => {
        const url = `https://tile.openstreetmap.org/${tile.z}/${tile.x}/${tile.y}.png`;
        const dir = `${TILE_FOLDER}/${tile.z}/${tile.x}`;
        const path = `${dir}/${tile.y}.png`;

        // Crear directorio si no existe
        const dirInfo = await FileSystem.getInfoAsync(dir);
        if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
        }

        // Verificar si el archivo ya existe
        const fileInfo = await FileSystem.getInfoAsync(path);
        if (fileInfo.exists) {
            return; // Saltar si ya existe
        }

        // Descargar el tile
        await FileSystem.downloadAsync(url, path);
    };

    // Convertir coordenadas de latitud/longitud a tiles
    const latLonToTile = (lat, lon, zoom) => {
        const latRad = lat * Math.PI / 180;
        const n = Math.pow(2, zoom);
        const x = Math.floor(((lon + 180) / 360) * n);
        const y = Math.floor(((1 - Math.log(Math.tan(latRad) + (1 / Math.cos(latRad))) / Math.PI) / 2) * n);
        return { x, y };
    };

    // Calcular nivel de zoom basado en longitudeDelta
    const calculateZoomLevel = (longitudeDelta) => {
        return Math.round(Math.log(360 / longitudeDelta) / Math.LN2);
    };

    // Obtener los tiles necesarios para una región
    const getTileGrid = (region, minZoom, maxZoom) => {
        const tiles = [];
        const { latitude, longitude, latitudeDelta, longitudeDelta } = region;
        const latMin = latitude - latitudeDelta / 2;
        const latMax = latitude + latitudeDelta / 2;
        const lonMin = longitude - longitudeDelta / 2;
        const lonMax = longitude + longitudeDelta / 2;

        for (let zoom = minZoom; zoom <= maxZoom; zoom++) {
            const topLeft = latLonToTile(latMax, lonMin, zoom);
            const bottomRight = latLonToTile(latMin, lonMax, zoom);
            for (let x = topLeft.x; x <= bottomRight.x; x++) {
                for (let y = topLeft.y; y <= bottomRight.y; y++) {
                    tiles.push({ x, y, z: zoom });
                }
            }
        }
        return tiles;
    };

    // Función para verificar GPS y solicitar permisos de ubicación
    const checkGPSAndPermissions = async () => {
        try {
            // Verificar si el GPS está habilitado
            const gpsStatus = await Location.hasServicesEnabledAsync();
            setGpsEnabled(gpsStatus);

            if (!gpsStatus) {
                Alert.alert(
                    "GPS Deshabilitado",
                    "Por favor, habilite el GPS en la configuración de su dispositivo para usar las funciones de ubicación.",
                    [{ text: "OK" }]
                );
                return;
            }

            const { status } = await Location.requestForegroundPermissionsAsync();
            setLocationPermission(status === "granted");

            if (status !== "granted") {
                Alert.alert(
                    "Permisos requeridos",
                    "Se necesitan permisos de ubicación para mostrar la ruta en el mapa."
                );
            }
        } catch (error) {
            console.error("Error al verificar GPS y permisos:", error);
        }
    };

    // Función para mostrar el mapa con verificaciones
    const showMapWithPermissions = async () => {
        if (!gpsEnabled) {
            Alert.alert(
                "GPS Deshabilitado",
                "Por favor, habilite el GPS en la configuración de su dispositivo.",
                [{ text: "OK" }]
            );
            return;
        }

        if (!locationPermission) {
            await checkGPSAndPermissions();
            if (!locationPermission) return;
        }

        try {
            setIsTrackingLocation(true);
            // Obtener ubicación inicial
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });
            const { latitude, longitude } = location.coords;
            setUserLocation({ latitude, longitude });

            // Actualizar región del mapa con la ubicación actual
            const newRegion = {
                latitude,
                longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            };
            setMapRegion(newRegion);
            setHasInitializedMapRegion(true);
            setShowMap(true);
        } catch (error) {
            console.error("Error al obtener ubicación:", error);
            Alert.alert("Error", "No se pudo obtener la ubicación actual");
        }
    };

    // Función para obtener la ubicación actual
    const getCurrentLocation = async () => {
        if (!locationPermission) {
            Alert.alert("Error", "No se tienen permisos de ubicación");
            return;
        }

        setIsLoadingLocation(true);
        try {
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
                timeout: 15000, // Tiempo de espera más largo para GPS
            });

            const { latitude, longitude } = location.coords;
            let address = `Coordenadas: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

            // Solo intentar geocodificación si hay conexión y no estamos en modo offline
            if (!isOfflineMode && isConnected) {
                try {
                    const addressResponse = await Location.reverseGeocodeAsync({
                        latitude,
                        longitude,
                    });

                    if (addressResponse.length > 0) {
                        const addr = addressResponse[0];
                        const addressParts = [
                            addr.street,
                            addr.streetNumber,
                            addr.city,
                            addr.region
                        ].filter(Boolean);

                        if (addressParts.length > 0) {
                            address = addressParts.join(', ');
                        }
                    }
                } catch (geocodeError) {
                    console.warn("Error en geocodificación:", geocodeError);
                    // Mantener las coordenadas como dirección
                }
            }

            setCurrentLocation({ latitude, longitude });
            setClientForm((prev) => ({
                ...prev,
                location: { latitude, longitude },
                address: address,
            }));

            Alert.alert("Éxito", "Ubicación obtenida correctamente");

        } catch (error) {
            console.error("Error al obtener ubicación GPS:", error);
            Alert.alert(
                "Error GPS",
                "No se pudo obtener la ubicación. Verifique que:\n• El GPS esté habilitado\n• Tenga señal GPS (intente al aire libre)\n• Los permisos de ubicación estén activos"
            );
        } finally {
            setIsLoadingLocation(false);
        }
    };

    // Función para resetear el formulario
    const resetForm = () => {
        setClientForm({
            name: "",
            contact: "",
            quantity: "",
            location: null,
            address: "",
            status: "pending",
            photos: [],
        });
    };

    // Funciones para la cámara
    const openCamera = async () => {
        if (!cameraPermission) {
            Alert.alert('Error', 'Se necesitan permisos de cámara');
            return;
        }
        setCameraVisible(true);
    };

    const takePicture = async () => {
        if (cameraRef) {
            try {
                const photo = await cameraRef.takePictureAsync({
                    quality: 0.7,
                    base64: true,
                });
                setCapturedPhoto(photo);
                setCameraVisible(false);
                setPhotoConfirmVisible(true);
            } catch (error) {
                console.error('Error tomando foto:', error);
                Alert.alert('Error', 'No se pudo tomar la foto');
            }
        }
    };

    const savePhoto = () => {
        if (capturedPhoto && clientForm.photos.length < 4) {
            const newPhotos = [...clientForm.photos, capturedPhoto.base64];
            setClientForm(prev => ({ ...prev, photos: newPhotos }));
        }
        setCapturedPhoto(null);
        setPhotoConfirmVisible(false);
    };

    const retakePhoto = () => {
        setCapturedPhoto(null);
        setPhotoConfirmVisible(false);
        setCameraVisible(true);
    };

    const removePhoto = (index) => {
        const newPhotos = clientForm.photos.filter((_, i) => i !== index);
        setClientForm(prev => ({ ...prev, photos: newPhotos }));
    };

    const openImageViewer = (images, startIndex = 0) => {
        setViewingImages(images);
        setSelectedImageIndex(startIndex);
        setImageViewerVisible(true);
    };

    // Función para validar la cantidad (solo medias cajas y cajas completas)
    const validateQuantity = (quantity) => {
        const num = parseFloat(quantity);
        if (isNaN(num) || num <= 0) return false;

        // Verificar que sea múltiplo de 0.5 (media caja)
        return (num * 2) % 1 === 0;
    };

    // Función para agregar un nuevo cliente
    const addClient = () => {
        // Validaciones
        if (!clientForm.name.trim()) {
            Alert.alert("Error", "El nombre es requerido");
            return;
        }

        if (!clientForm.contact.trim()) {
            Alert.alert("Error", "El contacto es requerido");
            return;
        }

        if (!clientForm.quantity || !validateQuantity(clientForm.quantity)) {
            Alert.alert(
                "Error",
                "La cantidad debe ser en medias cajas o cajas completas (ej: 0.5, 1, 1.5, 2)"
            );
            return;
        }

        // Crear nuevo cliente
        const newClient = {
            id: Date.now().toString(),
            name: clientForm.name.trim(),
            contact: clientForm.contact.trim(),
            quantity: parseFloat(clientForm.quantity),
            location: clientForm.location || null, // Ubicación opcional
            address: clientForm.address || "Ubicación no especificada",
            status: "pending",
            photos: clientForm.photos || [],
            createdAt: new Date().toISOString(),
        };

        // Actualizar la venta con el nuevo cliente
        const updatedClients = [...clients, newClient];
        const updatedSale = {
            ...sale,
            clients: updatedClients,
        };

        updateSale(updatedSale);
        setClientModalVisible(false);
        resetForm();
    };

    // Función para cambiar el estado de un cliente
    const toggleClientStatus = (clientId) => {
        const updatedClients = clients.map((client) => {
            if (client.id === clientId) {
                return {
                    ...client,
                    status: client.status === "pending" ? "confirmed" : "pending",
                    confirmedAt:
                        client.status === "pending" ? new Date().toISOString() : null,
                };
            }
            return client;
        });

        const updatedSale = {
            ...sale,
            clients: updatedClients,
        };

        updateSale(updatedSale);
    };

    // Función para abrir modal de edición
    const openEditModal = (client) => {
        setEditingClient(client);
        setClientForm({
            name: client.name,
            contact: client.contact,
            quantity: client.quantity.toString(),
            location: client.location,
            address: client.address,
            status: client.status,
            photos: client.photos || [],
        });
        setEditModalVisible(true);
    };

    // Función para actualizar cliente
    const updateClient = () => {
        // Validaciones
        if (!clientForm.name.trim()) {
            Alert.alert("Error", "El nombre es requerido");
            return;
        }

        if (!clientForm.contact.trim()) {
            Alert.alert("Error", "El contacto es requerido");
            return;
        }

        if (!clientForm.quantity || !validateQuantity(clientForm.quantity)) {
            Alert.alert(
                "Error",
                "La cantidad debe ser en medias cajas o cajas completas (ej: 0.5, 1, 1.5, 2)"
            );
            return;
        }

        // Actualizar cliente existente
        const updatedClients = clients.map((client) => {
            if (client.id === editingClient.id) {
                return {
                    ...client,
                    name: clientForm.name.trim(),
                    contact: clientForm.contact.trim(),
                    quantity: parseFloat(clientForm.quantity),
                    location: clientForm.location || null, // Ubicación opcional
                    address: clientForm.address || "Ubicación no especificada",
                    photos: clientForm.photos || [],
                    updatedAt: new Date().toISOString(),
                };
            }
            return client;
        });

        const updatedSale = {
            ...sale,
            clients: updatedClients,
        };

        updateSale(updatedSale);
        setEditModalVisible(false);
        setEditingClient(null);
        resetForm();
    };

    // Función para eliminar un cliente
    const deleteClient = (clientId) => {
        Alert.alert(
            "Eliminar cliente permanentemente",
            "⚠️ ADVERTENCIA: Está a punto de eliminar todos los datos y registros de este cliente para siempre. Esta acción no se puede deshacer.\n\n¿Está completamente seguro?",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Eliminar para siempre",
                    style: "destructive",
                    onPress: () => {
                        const updatedClients = clients.filter(
                            (client) => client.id !== clientId
                        );
                        const updatedSale = {
                            ...sale,
                            clients: updatedClients,
                        };
                        updateSale(updatedSale);
                    },
                },
            ]
        );
    };

    // Función para marcar pedido como entregado
    const markAsDelivered = (clientId) => {
        Alert.alert(
            "Confirmar entrega",
            "Se registrará que el pedido ha sido entregado al cliente sin problemas y el cliente regresará a la sección de pendientes.",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Aceptar",
                    onPress: () => {
                        const client = clients.find(c => c.id === clientId);
                        if (!client) return;

                        // Calcular el total de la venta
                        const total = client.quantity * eggsPrice * 12; // Suponiendo que una caja tiene 12 cartones

                        // Crear una transacción para la venta de ruta
                        const transaction = {
                            id: Date.now().toString(),
                            type: 'route',
                            quantity: client.quantity,
                            unitPrice: eggsPrice * 12, // Precio por caja
                            total,
                            receivedMoney: {}, // Asumimos pago exacto por simplicidad
                            totalReceived: total,
                            change: 0,
                            location: client.address,
                            saleType: "Ruta",
                            timestamp: new Date().toISOString(),
                        };

                        // Actualizar el cliente a pending (no eliminarlo)
                        const updatedClients = clients.map((c) => {
                            if (c.id === clientId) {
                                return {
                                    ...c,
                                    status: "pending",
                                    deliveredAt: new Date().toISOString(),
                                    confirmedAt: null,
                                };
                            }
                            return c;
                        });

                        // Añadir la transacción a la venta
                        const updatedSale = {
                            ...sale,
                            clients: updatedClients,
                            transactions: [...(sale.transactions || []), transaction],
                        };

                        updateSale(updatedSale);
                    },
                },
            ]
        );
    };

    // Función para cancelar pedido confirmado
    const cancelConfirmedOrder = (clientId) => {
        Alert.alert(
            "Cancelar pedido",
            "El pedido ha sido cancelado por el cliente y regresará a la sección de pendientes.",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Aceptar",
                    style: "destructive",
                    onPress: () => {
                        const updatedClients = clients.map((client) => {
                            if (client.id === clientId) {
                                return {
                                    ...client,
                                    status: "pending",
                                    confirmedAt: null,
                                    cancelledAt: new Date().toISOString(),
                                };
                            }
                            return client;
                        });
                        const updatedSale = {
                            ...sale,
                            clients: updatedClients,
                        };
                        updateSale(updatedSale);
                    },
                },
            ]
        );
    };

    // Función para centrar el mapa en la ubicación del usuario
    const centerMapOnUser = () => {
        if (userLocation && mapRef) {
            mapRef.animateToRegion({
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            }, 1000);
        }
    };

    // Generar polyline para la ruta (líneas conectando ubicaciones)
    const generateRouteCoordinates = () => {
        const coordinates = [];

        // Agregar ubicación del usuario si está disponible
        if (userLocation) {
            coordinates.push(userLocation);
        }

        // Agregar ubicaciones de clientes confirmados
        confirmedClients.forEach((client) => {
            if (client.location) {
                coordinates.push({
                    latitude: client.location.latitude,
                    longitude: client.location.longitude,
                });
            }
        });

        return coordinates;
    };

    // Renderizar item de cliente
    const renderClientItem = (item, index) => (
        <View key={item.id} style={styles.clientItem}>
            <View style={styles.clientHeader}>
                <Text style={styles.clientName}>{item.name}</Text>
            </View>

            <Text style={styles.clientContact}>📞 {item.contact}</Text>
            <Text style={styles.clientQuantity}>
                📦 {item.quantity} {item.quantity === 1 ? 'caja' : 'cajas'}
                (${(item.quantity * eggsPrice * 12).toFixed(2)})
            </Text>
            <Text style={styles.clientAddress}>📍 {item.address}</Text>

            {/* Mostrar fotos de referencia */}
            {item.photos && item.photos.length > 0 && (
                <View style={styles.photosContainer}>
                    <Text style={styles.photosLabel}>📷 Fotografías de referencia:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScrollView}>
                        {item.photos.map((photo, photoIndex) => (
                            <TouchableOpacity
                                key={photoIndex}
                                style={styles.photoThumbnail}
                                onPress={() => openImageViewer(item.photos, photoIndex)}
                            >
                                <Image
                                    source={{ uri: `data:image/jpeg;base64,${photo}` }}
                                    style={styles.thumbnailImage}
                                />
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            <Text style={styles.clientDate}>
                Registrado: {formatDate(item.createdAt)} {formatTime(item.createdAt)}
            </Text>
            {item.confirmedAt && (
                <Text style={styles.clientConfirmedDate}>
                    Confirmado: {formatDate(item.confirmedAt)} {formatTime(item.confirmedAt)}
                </Text>
            )}

            {/* Botones según el estado del cliente */}
            {item.status === 'pending' ? (
                <View style={styles.clientActionsContainer}>
                    <View style={styles.clientTopActions}>
                        <TouchableOpacity
                            style={styles.editButton}
                            onPress={() => openEditModal(item)}
                        >
                            <Text style={styles.editButtonText}>✏️ Editar información</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.confirmButton}
                            onPress={() => toggleClientStatus(item.id)}
                        >
                            <Text style={styles.confirmButtonText}>🔃 El cliente confirmó</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.clientBottomActions}>
                        <TouchableOpacity
                            style={styles.mapButton}
                            onPress={() => centerMapOnClient(item)}
                        >
                            <Text style={styles.mapButtonText}>🗺️ Ver en el mapa</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => deleteClient(item.id)}
                        >
                            <Text style={styles.deleteButtonText}>🗑️ Eliminar cliente</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ) : (
                <View style={styles.clientActionsContainer}>
                    <View style={styles.clientTopActions}>
                        <TouchableOpacity
                            style={styles.deliveredButton}
                            onPress={() => markAsDelivered(item.id)}
                        >
                            <Text style={styles.deliveredButtonText}>✅ Pedido entregado</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.cancelOrderButton}
                            onPress={() => cancelConfirmedOrder(item.id)}
                        >
                            <Text style={styles.cancelOrderButtonText}>❌ Pedido cancelado</Text>
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                        style={styles.mapButton}
                        onPress={() => centerMapOnClient(item)}
                    >
                        <Text style={styles.mapButtonText}>🗺️ Ver en el mapa</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );

    // Renderizar modal para agregar cliente
    const renderClientModal = () => (
        <Modal
            animationType="slide"
            transparent={true}
            visible={clientModalVisible}
            onRequestClose={() => setClientModalVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text style={styles.modalTitle}>Agregar Cliente</Text>

                        {/* Campo nombre */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Nombre de tienda/local:</Text>
                            <TextInput
                                style={styles.input}
                                value={clientForm.name}
                                onChangeText={(text) =>
                                    setClientForm((prev) => ({ ...prev, name: text }))
                                }
                                placeholder="Tienda La Esperanza"
                                placeholderTextColor={COLORS.textSecondary}
                            />
                        </View>

                        {/* Campo contacto */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Contacto (teléfono/email):</Text>
                            <TextInput
                                style={styles.input}
                                value={clientForm.contact}
                                onChangeText={(text) =>
                                    setClientForm((prev) => ({ ...prev, contact: text }))
                                }
                                placeholder="7123-4567 o email@ejemplo.com"
                                placeholderTextColor={COLORS.textSecondary}
                            />
                        </View>

                        {/* Campo cantidad */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Cantidad (cajas):</Text>
                            <TextInput
                                style={styles.input}
                                value={clientForm.quantity}
                                onChangeText={(text) =>
                                    setClientForm((prev) => ({ ...prev, quantity: text }))
                                }
                                keyboardType="numeric"
                                placeholder="1.5 (una caja y media)"
                                placeholderTextColor={COLORS.textSecondary}
                            />
                            <Text style={styles.quantityHelper}>
                                Solo medias cajas y cajas completas: 0.5, 1, 1.5, 2, etc.
                            </Text>
                        </View>

                        {/* Ubicación */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Ubicación (opcional):</Text>
                            <View style={styles.locationOptionsContainer}>
                                <TouchableOpacity
                                    style={[
                                        styles.locationOptionButton,
                                        isLoadingLocation && styles.locationButtonLoading
                                    ]}
                                    onPress={getCurrentLocation}
                                    disabled={isLoadingLocation}
                                >
                                    {isLoadingLocation ? (
                                        <ActivityIndicator color={COLORS.text} />
                                    ) : (
                                        <Text style={styles.locationOptionText}>📍 Automática</Text>
                                    )}
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.locationOptionButton}
                                    onPress={() => setManualLocationModalVisible(true)}
                                >
                                    <Text style={styles.locationOptionText}>🗺️ Manual</Text>
                                </TouchableOpacity>
                            </View>
                            {clientForm.address && (
                                <Text style={styles.addressText}>{clientForm.address}</Text>
                            )}
                        </View>

                        {/* Fotos de referencia */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Fotos de referencia (opcional):</Text>
                            <View style={styles.photosInputContainer}>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    {clientForm.photos.map((photo, index) => (
                                        <View key={index} style={styles.photoPreviewContainer}>
                                            <Image
                                                source={{ uri: `data:image/jpeg;base64,${photo}` }}
                                                style={styles.photoPreview}
                                            />
                                            <TouchableOpacity
                                                style={styles.removePhotoButton}
                                                onPress={() => removePhoto(index)}
                                            >
                                                <Text style={styles.removePhotoText}>✕</Text>
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                    {clientForm.photos.length < 4 && (
                                        <TouchableOpacity
                                            style={styles.addPhotoButton}
                                            onPress={openCamera}
                                        >
                                            <Text style={styles.addPhotoText}>+</Text>
                                        </TouchableOpacity>
                                    )}
                                </ScrollView>
                            </View>
                            <Text style={styles.photoHelper}>
                                Máximo 4 fotografías. Toque + para agregar.
                            </Text>
                        </View>

                        {/* Botones */}
                        <View style={styles.modalButtonsContainer}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => {
                                    setClientModalVisible(false);
                                    resetForm();
                                }}
                            >
                                <Text style={styles.modalButtonText}>Cancelar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalButton, styles.addButton]}
                                onPress={addClient}
                            >
                                <Text style={styles.modalButtonText}>Agregar</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );

    // Renderizar modal para editar cliente
    const renderEditModal = () => (
        <Modal
            animationType="slide"
            transparent={true}
            visible={editModalVisible}
            onRequestClose={() => setEditModalVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text style={styles.modalTitle}>Editar Cliente</Text>

                        {/* Campo nombre */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Nombre de tienda/local:</Text>
                            <TextInput
                                style={styles.input}
                                value={clientForm.name}
                                onChangeText={(text) => setClientForm(prev => ({ ...prev, name: text }))}
                                placeholder="Tienda La Esperanza"
                                placeholderTextColor={COLORS.textSecondary}
                            />
                        </View>

                        {/* Campo contacto */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Contacto (teléfono/email):</Text>
                            <TextInput
                                style={styles.input}
                                value={clientForm.contact}
                                onChangeText={(text) => setClientForm(prev => ({ ...prev, contact: text }))}
                                placeholder="7123-4567 o email@ejemplo.com"
                                placeholderTextColor={COLORS.textSecondary}
                            />
                        </View>

                        {/* Campo cantidad */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Cantidad (cajas):</Text>
                            <TextInput
                                style={styles.input}
                                value={clientForm.quantity}
                                onChangeText={(text) => setClientForm(prev => ({ ...prev, quantity: text }))}
                                keyboardType="numeric"
                                placeholder="1.5 (una caja y media)"
                                placeholderTextColor={COLORS.textSecondary}
                            />
                            <Text style={styles.quantityHelper}>
                                Solo medias cajas y cajas completas: 0.5, 1, 1.5, 2, etc.
                            </Text>
                        </View>

                        {/* Ubicación */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Ubicación (opcional):</Text>
                            <View style={styles.locationOptionsContainer}>
                                <TouchableOpacity
                                    style={[
                                        styles.locationOptionButton,
                                        isLoadingLocation && styles.locationButtonLoading
                                    ]}
                                    onPress={getCurrentLocation}
                                    disabled={isLoadingLocation}
                                >
                                    {isLoadingLocation ? (
                                        <ActivityIndicator color={COLORS.text} />
                                    ) : (
                                        <Text style={styles.locationOptionText}>📍 Automática</Text>
                                    )}
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.locationOptionButton}
                                    onPress={() => setManualLocationModalVisible(true)}
                                >
                                    <Text style={styles.locationOptionText}>🗺️ Manual</Text>
                                </TouchableOpacity>
                            </View>
                            {clientForm.address && (
                                <Text style={styles.addressText}>{clientForm.address}</Text>
                            )}
                        </View>

                        {/* Botones */}
                        <View style={styles.modalButtonsContainer}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => {
                                    setEditModalVisible(false);
                                    setEditingClient(null);
                                    resetForm();
                                }}
                            >
                                <Text style={styles.modalButtonText}>Cancelar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalButton, styles.addButton]}
                                onPress={updateClient}
                            >
                                <Text style={styles.modalButtonText}>Actualizar</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );

    // Renderizar modal de confirmación de descarga
    const renderOfflineDownloadModal = () => (
        <Modal
            animationType="slide"
            transparent={true}
            visible={offlineDownloadModalVisible}
            onRequestClose={() => !isDownloading && setOfflineDownloadModalVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Descargar Mapa para Uso Offline</Text>

                    {!isDownloading ? (
                        <>
                            <Text style={styles.modalText}>
                                Está a punto de descargar el mapa para uso offline. Esto ocupará espacio en el almacenamiento de su dispositivo.
                            </Text>
                            <View style={styles.modalButtonsContainer}>
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.cancelButton]}
                                    onPress={() => setOfflineDownloadModalVisible(false)}
                                >
                                    <Text style={styles.modalButtonText}>Cancelar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.addButton]}
                                    onPress={downloadTilesWithProgress}
                                >
                                    <Text style={styles.modalButtonText}>Iniciar Descarga</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    ) : (
                        <View style={styles.progressContainer}>
                            <Text style={styles.progressText}>{downloadStatus}</Text>
                            <Text style={styles.progressNumbers}>
                                {downloadedTiles} / {totalTiles} tiles
                            </Text>

                            {/* Barra de progreso visual */}
                            <View style={styles.progressBarContainer}>
                                <View
                                    style={[
                                        styles.progressBarFill,
                                        { width: `${Math.round(downloadProgress * 100)}%` }
                                    ]}
                                />
                            </View>

                            <Text style={styles.progressPercentage}>
                                {Math.round(downloadProgress * 100)}%
                            </Text>

                            <ActivityIndicator
                                size="large"
                                color={COLORS.accent}
                                style={styles.loadingIndicator}
                            />
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );

    // Renderizar modal de cámara
    function renderCameraModal() {
        return (
            <Modal
                animationType="slide"
                transparent={false}
                visible={cameraVisible}
                onRequestClose={() => setCameraVisible(false)}
            >
                <View style={styles.cameraContainer}>
                    <CameraView
                        style={styles.camera}
                        facing="back" // Cambiado de type a facing
                        ref={setCameraRef}
                    />
                    <View style={styles.cameraButtonsContainer}>
                        <TouchableOpacity
                            style={styles.closeCameraButton}
                            onPress={() => setCameraVisible(false)}
                        >
                            <Text style={styles.closeCameraText}>✕</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.captureButton}
                            onPress={takePicture}
                        >
                            <View style={styles.captureButtonInner} />
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        );
    }

    // Renderizar modal de confirmación de foto
    function renderPhotoConfirmModal() {
        return (
            <Modal
                animationType="slide"
                transparent={true}
                visible={photoConfirmVisible}
                onRequestClose={() => setPhotoConfirmVisible(false)}
            >
                <View style={styles.photoConfirmOverlay}>
                    <View style={styles.photoConfirmContent}>
                        {capturedPhoto && (
                            <Image
                                source={{ uri: `data:image/jpeg;base64,${capturedPhoto.base64}` }}
                                style={styles.photoPreviewLarge}
                            />
                        )}
                        <View style={styles.photoConfirmButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={retakePhoto}
                            >
                                <Text style={styles.modalButtonText}>Tomar de nuevo</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.addButton]}
                                onPress={savePhoto}
                            >
                                <Text style={styles.modalButtonText}>Guardar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        );
    }

    // Renderizar visor de imágenes en pantalla completa
    function renderImageViewer() {
        return (
            <Modal
                animationType="fade"
                transparent={true}
                visible={imageViewerVisible}
                onRequestClose={() => setImageViewerVisible(false)}
            >
                <View style={styles.imageViewerOverlay}>
                    <TouchableOpacity
                        style={styles.closeImageViewer}
                        onPress={() => setImageViewerVisible(false)}
                    >
                        <Text style={styles.closeImageViewerText}>✕</Text>
                    </TouchableOpacity>

                    <ScrollView
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onMomentumScrollEnd={(event) => {
                            const index = Math.floor(event.nativeEvent.contentOffset.x / width);
                            setSelectedImageIndex(index);
                        }}
                        contentOffset={{ x: selectedImageIndex * width, y: 0 }}
                    >
                        {viewingImages.map((image, index) => (
                            <ScrollView
                                key={index}
                                style={styles.imageScrollView}
                                minimumZoomScale={1}
                                maximumZoomScale={3}
                                showsVerticalScrollIndicator={false}
                                showsHorizontalScrollIndicator={false}
                            >
                                <Image
                                    source={{ uri: `data:image/jpeg;base64,${image}` }}
                                    style={styles.fullScreenImage}
                                    resizeMode="contain"
                                />
                            </ScrollView>
                        ))}
                    </ScrollView>

                    {viewingImages.length > 1 && (
                        <View style={styles.imageCounter}>
                            <Text style={styles.imageCounterText}>
                                {selectedImageIndex + 1} / {viewingImages.length}
                            </Text>
                        </View>
                    )}
                </View>
            </Modal>
        );
    }

    // Renderizar modal de ubicación manual
    const renderManualLocationModal = () => (
        <Modal
            animationType="slide"
            transparent={true}
            visible={manualLocationModalVisible}
            onRequestClose={() => setManualLocationModalVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.manualLocationModalContent}>
                    <Text style={styles.modalTitle}>Seleccionar Ubicación Manualmente</Text>
                    <View style={styles.manualMapContainer}>
                        <MapView
                            style={styles.manualMap}
                            initialRegion={userLocation ? {
                                latitude: userLocation.latitude,
                                longitude: userLocation.longitude,
                                latitudeDelta: 0.01,
                                longitudeDelta: 0.01
                            } : mapRegion}
                            mapType={manualMapType}
                            onPress={(e) => setSelectedLocation(e.nativeEvent.coordinate)}
                            showsUserLocation={true}
                        >
                            <UrlTile
                                urlTemplate={isOfflineMode ? OFFLINE_TILE_URL : ONLINE_TILE_URL}
                                maximumZ={19}
                                flipY={false}
                            />
                            {selectedLocation && (
                                <Marker coordinate={selectedLocation} title="Ubicación seleccionada" />
                            )}
                        </MapView>
                        <View style={styles.manualMapButtons}>
                            <TouchableOpacity
                                style={styles.mapTypeButton}
                                onPress={() => {
                                    if (manualMapType === 'standard') {
                                        if (isConnected) {
                                            setManualMapType('satellite');
                                        } else {
                                            Alert.alert("Sin conexión", "El modo satélite requiere conexión a internet.");
                                        }
                                    } else {
                                        setManualMapType('standard');
                                    }
                                }}
                            >
                                <Text style={styles.mapTypeButtonText}>
                                    {manualMapType === 'standard' ? '🛰️ Satélite' : '🗺️ Standard'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.manualLocationButtons}>
                        {selectedLocation && (
                            <TouchableOpacity
                                style={styles.markHereButton}
                                onPress={async () => {
                                    let address = `Coordenadas: ${selectedLocation.latitude.toFixed(6)}, ${selectedLocation.longitude.toFixed(6)}`;
                                    if (!isOfflineMode) {
                                        try {
                                            const addressResponse = await Location.reverseGeocodeAsync(selectedLocation);
                                            if (addressResponse.length > 0) {
                                                const addr = addressResponse[0];
                                                address = [addr.street, addr.streetNumber, addr.city, addr.region]
                                                    .filter(Boolean)
                                                    .join(', ');
                                            }
                                        } catch (error) {
                                            console.warn("Error en geocodificación:", error);
                                        }
                                    }
                                    setClientForm(prev => ({
                                        ...prev,
                                        location: selectedLocation,
                                        address: address,
                                    }));
                                    setManualLocationModalVisible(false);
                                    setSelectedLocation(null);
                                }}
                            >
                                <Text style={styles.markHereButtonText}>Marcar aquí</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={styles.cancelManualButton}
                            onPress={() => {
                                setManualLocationModalVisible(false);
                                setSelectedLocation(null);
                            }}
                        >
                            <Text style={styles.cancelManualButtonText}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    // Función para centrar el mapa en un cliente específico
    const centerMapOnClient = (client) => {
        if (!showMap) {
            Alert.alert(
                "Mapa desactivado",
                "Debe activar la vista de mapa presionando el botón 'Mostrar Mapa' para ver la ubicación del cliente."
            );
            return;
        }

        if (!client.location) {
            Alert.alert("Error", "Este cliente no tiene ubicación registrada");
            return;
        }

        if (mapRef) {
            mapRef.animateToRegion({
                latitude: client.location.latitude,
                longitude: client.location.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
            }, 1000);
        }
    };

    // Obtener la lista de clientes actual según la pestaña activa (ordenados del más reciente al más antiguo)
    const currentClients = (activeClientTab === 'confirmed' ? confirmedClients : pendingClients)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return (
        <View style={styles.container}>
            <ScrollView
                style={styles.mainScrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {!showMap ? (
                    <View style={styles.mapPlaceholder}>
                        <Text style={styles.mapPlaceholderText}>
                            {!gpsEnabled
                                ? "GPS deshabilitado. Habilite el GPS para usar el mapa."
                                : "El mapa está oculto para mejorar el rendimiento."
                            }
                        </Text>
                        <TouchableOpacity
                            style={[
                                styles.showMapButton,
                                !gpsEnabled && styles.disabledButton
                            ]}
                            onPress={showMapWithPermissions}
                            disabled={!gpsEnabled}
                        >
                            <Text style={styles.showMapButtonText}>
                                {!gpsEnabled ? "🔒 Habilitar GPS" : "🗺️ Mostrar Mapa"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.mapContainer}>
                        <MapView
                            ref={(ref) => setMapRef(ref)}
                            style={styles.map}
                            initialRegion={mapRegion}
                            mapType={mapType} // Propiedad para cambiar el tipo de mapa
                            showsUserLocation={true}
                            showsMyLocationButton={false}
                            showsCompass={true}
                            showsScale={true}
                            scrollEnabled={true}
                            zoomEnabled={true}
                            loadingEnabled={true}
                            loadingIndicatorColor={COLORS.accent}
                            loadingBackgroundColor={COLORS.background}
                            onMapReady={() => console.log('Mapa cargado correctamente')}
                            onError={(error) => console.error('Error en el mapa:', error)}
                            onRegionChangeComplete={setMapRegion}
                        >
                            {/* Usamos UrlTile para cargar tiles online u offline */}
                            <UrlTile
                                urlTemplate={isOfflineMode ? OFFLINE_TILE_URL : ONLINE_TILE_URL}
                                maximumZ={19}
                                flipY={false}
                            />

                            {userLocation && (
                                <Marker
                                    coordinate={userLocation}
                                    title="Tu ubicación"
                                    pinColor="blue"
                                />
                            )}

                            {confirmedClients.filter(client => client.location).map(client => (
                                <Marker
                                    key={`confirmed-${client.id}`}
                                    coordinate={{
                                        latitude: client.location.latitude,
                                        longitude: client.location.longitude,
                                    }}
                                    title={client.name || "Cliente"}
                                    description={`${client.quantity || 0} cajas - Confirmado`}
                                    pinColor="green"
                                />
                            ))}

                            {pendingClients.filter(client => client.location).map(client => (
                                <Marker
                                    key={`pending-${client.id}`}
                                    coordinate={{
                                        latitude: client.location.latitude,
                                        longitude: client.location.longitude,
                                    }}
                                    title={client.name || "Cliente"}
                                    description={`${client.quantity || 0} cajas - Pendiente`}
                                    pinColor="orange"
                                />
                            ))}

                            {generateRouteCoordinates().length > 1 && (
                                <Polyline
                                    coordinates={generateRouteCoordinates()}
                                    strokeColor={COLORS.accent}
                                    strokeWidth={3}
                                />
                            )}
                        </MapView>

                        <View style={styles.mapButtonsContainer}>
                            <TouchableOpacity
                                style={styles.mapActionButton}
                                onPress={centerMapOnUser}
                            >
                                <Text style={styles.mapActionButtonText}>📍</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.mapActionButton}
                                onPress={() => setShowMap(false)}
                            >
                                <Text style={styles.mapActionButtonText}>✕</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.mapActionButton}
                                onPress={() => {
                                    if (mapType === 'standard') {
                                        if (isConnected) {
                                            setMapType('satellite');
                                        } else {
                                            Alert.alert("Sin conexión", "El modo satélite requiere conexión a internet.");
                                        }
                                    } else {
                                        setMapType('standard');
                                    }
                                }}
                            >
                                <Text style={styles.mapActionButtonText}>
                                    {mapType === 'standard' ? '🛰️' : '🗺️'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Controles para el modo offline */}
                {showMap && (
                    <View style={styles.offlineControls}>
                        <TouchableOpacity
                            style={[styles.offlineButton, isOfflineMode && styles.offlineButtonActive]}
                            onPress={() => {
                                if (isConnected) {
                                    setIsOfflineMode(!isOfflineMode);
                                } else {
                                    Alert.alert("Sin conexión", "No hay conexión a internet disponible.");
                                }
                            }}
                        >
                            <Text style={styles.offlineButtonText}>
                                {isOfflineMode ? `📶 Modo Online ${!isConnected ? '(Sin conexión)' : ''}` : "📴 Modo Offline"}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.downloadButton,
                                (isDownloading || !isConnected) && styles.downloadButtonDisabled
                            ]}
                            onPress={() => setOfflineDownloadModalVisible(true)}
                            disabled={isDownloading || !isConnected}
                        >
                            <Text style={styles.downloadButtonText}>
                                {isDownloading ? "⏳ Descargando..." : !isConnected ? "❌ Sin conexión" : "💾 Descargar Mapa"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.routeSummary}>
                    <Text style={styles.summaryTitle}>Resumen de Ruta</Text>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryText}>
                            Confirmados: {confirmedClients.length}
                        </Text>
                        <Text style={styles.summaryText}>
                            Pendientes: {pendingClients.length}
                        </Text>
                    </View>
                    <Text style={styles.summaryText}>
                        Total cajas programadas:{" "}
                        {confirmedClients.reduce((sum, client) => sum + client.quantity, 0)}
                    </Text>
                </View>

                <View style={styles.clientTabContainer}>
                    <TouchableOpacity
                        style={[
                            styles.clientTab,
                            activeClientTab === "confirmed" && styles.activeClientTab,
                        ]}
                        onPress={() => setActiveClientTab("confirmed")}
                    >
                        <Text
                            style={[
                                styles.clientTabText,
                                activeClientTab === "confirmed" && styles.activeClientTabText,
                            ]}
                        >
                            Confirmados ({confirmedClients.length})
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.clientTab,
                            activeClientTab === "pending" && styles.activeClientTab,
                        ]}
                        onPress={() => setActiveClientTab("pending")}
                    >
                        <Text
                            style={[
                                styles.clientTabText,
                                activeClientTab === "pending" && styles.activeClientTabText,
                            ]}
                        >
                            Pendientes ({pendingClients.length})
                        </Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={styles.addClientButton}
                    onPress={() => setClientModalVisible(true)}
                >
                    <Text style={styles.addClientButtonText}>(+) Agregar Cliente</Text>
                </TouchableOpacity>

                <View style={styles.clientsContainer}>
                    {currentClients.length > 0 ? (
                        currentClients.map((client, index) => renderClientItem(client, index))
                    ) : (
                        <Text style={styles.noDataText}>
                            No hay clientes{" "}
                            {activeClientTab === "confirmed" ? "confirmados" : "pendientes"}
                        </Text>
                    )}
                </View>
            </ScrollView>

            {renderClientModal()}
            {renderEditModal()}
            {renderOfflineDownloadModal()}
            {renderCameraModal()}
            {renderPhotoConfirmModal()}
            {renderImageViewer()}
            {renderManualLocationModal()}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    mainScrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 20, // Espacio adicional al final para el scroll
    },
    loadingText: {
        color: COLORS.text,
        textAlign: "center",
        marginTop: 50,
        fontSize: 16,
    },
    mapContainer: {
        height: height * 0.4, // 40% de la altura de la pantalla
        marginBottom: 20,
        position: "relative",
    },
    map: {
        flex: 1,
        borderRadius: 10,
        margin: 10,
        width: '100%',
        height: '100%',
    },
    routeSummary: {
        backgroundColor: COLORS.card,
        padding: 15,
        marginHorizontal: 10,
        borderRadius: 10,
        marginBottom: 10,
    },
    summaryTitle: {
        color: COLORS.text,
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 8,
    },
    summaryRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 5,
    },
    summaryText: {
        color: COLORS.textSecondary,
        fontSize: 14,
    },
    clientTabContainer: {
        flexDirection: "row",
        backgroundColor: COLORS.card,
        marginHorizontal: 10,
        borderRadius: 8,
        marginBottom: 10,
    },
    clientTab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: "center",
    },
    activeClientTab: {
        backgroundColor: COLORS.accent,
        borderRadius: 8,
    },
    clientTabText: {
        color: COLORS.textSecondary,
        fontSize: 14,
    },
    activeClientTabText: {
        color: COLORS.text,
        fontWeight: "bold",
    },
    addClientButton: {
        backgroundColor: COLORS.secondary,
        padding: 15,
        marginHorizontal: 10,
        borderRadius: 8,
        alignItems: "center",
        marginBottom: 10,
    },
    addClientButtonText: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: "bold",
    },
    clientsContainer: {
        paddingHorizontal: 10,
    },
    clientItem: {
        backgroundColor: COLORS.card,
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
    },
    clientHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    clientName: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: "bold",
        flex: 1,
    },
    clientActions: {
        flexDirection: "row",
        gap: 8,
    },
    statusButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
    },
    confirmedButton: {
        backgroundColor: COLORS.success,
    },
    pendingButton: {
        backgroundColor: COLORS.warning,
    },
    statusButtonText: {
        color: COLORS.text,
        fontSize: 12,
        fontWeight: "bold",
    },
    deleteButton: {
        backgroundColor: COLORS.error,
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: "center",
        marginTop: 5,
    },
    deleteButtonText: {
        color: COLORS.text,
        fontSize: 12,
        fontWeight: "bold",
    },
    clientContact: {
        color: COLORS.textSecondary,
        fontSize: 14,
        marginBottom: 4,
    },
    clientQuantity: {
        color: COLORS.accent,
        fontSize: 14,
        fontWeight: "bold",
        marginBottom: 4,
    },
    clientAddress: {
        color: COLORS.textSecondary,
        fontSize: 12,
        marginBottom: 4,
    },
    clientDate: {
        color: COLORS.textSecondary,
        fontSize: 12,
        marginBottom: 2,
    },
    clientConfirmedDate: {
        color: COLORS.success,
        fontSize: 12,
    },
    noDataText: {
        color: COLORS.textSecondary,
        textAlign: "center",
        marginTop: 20,
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalContent: {
        backgroundColor: COLORS.card,
        borderRadius: 15,
        padding: 20,
        width: width * 0.9,
        maxHeight: height * 0.8,
    },
    modalTitle: {
        color: COLORS.text,
        fontSize: 20,
        fontWeight: "bold",
        textAlign: "center",
        marginBottom: 20,
    },
    inputContainer: {
        marginBottom: 15,
    },
    inputLabel: {
        color: COLORS.text,
        fontSize: 14,
        marginBottom: 5,
    },
    input: {
        backgroundColor: COLORS.background,
        color: COLORS.text,
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    quantityHelper: {
        color: COLORS.textSecondary,
        fontSize: 12,
        marginTop: 5,
        fontStyle: "italic",
    },
    locationButton: {
        backgroundColor: COLORS.accent,
        padding: 12,
        borderRadius: 8,
        alignItems: "center",
    },
    locationButtonLoading: {
        backgroundColor: COLORS.textSecondary,
    },
    locationButtonText: {
        color: COLORS.text,
        fontWeight: "bold",
    },
    addressText: {
        color: COLORS.textSecondary,
        fontSize: 12,
        marginTop: 8,
        padding: 8,
        backgroundColor: COLORS.background,
        borderRadius: 5,
    },
    modalButtonsContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 20,
        gap: 10,
    },
    modalButton: {
        flex: 1,
        padding: 15,
        borderRadius: 8,
        alignItems: "center",
    },
    cancelButton: {
        backgroundColor: COLORS.textSecondary,
    },
    addButton: {
        backgroundColor: COLORS.success,
    },
    modalButtonText: {
        color: COLORS.text,
        fontWeight: 'bold',
    },
    clientActionsContainer: {
        marginTop: 15,
    },
    clientTopActions: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 10,
    },
    clientBottomActions: {
        flexDirection: 'row',
        gap: 8,
    },
    mapButton: {
        backgroundColor: COLORS.accent,
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
        flex: 1,
    },
    mapButtonText: {
        color: COLORS.text,
        fontSize: 12,
        fontWeight: 'bold',
    },
    editButton: {
        backgroundColor: COLORS.accent,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        flex: 1,
    },
    editButtonText: {
        color: COLORS.text,
        fontSize: 12,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    confirmButton: {
        backgroundColor: COLORS.success,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        flex: 1,
    },
    confirmButtonText: {
        color: COLORS.text,
        fontSize: 12,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    deliveredButton: {
        backgroundColor: COLORS.success,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        flex: 1,
    },
    deliveredButtonText: {
        color: COLORS.text,
        fontSize: 12,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    cancelOrderButton: {
        backgroundColor: COLORS.error,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        flex: 1,
    },
    cancelOrderButtonText: {
        color: COLORS.text,
        fontSize: 12,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    mapPlaceholder: {
        height: 200,
        backgroundColor: COLORS.cardBackground,
        margin: 15,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    mapPlaceholderText: {
        fontSize: 16,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: 15,
    },
    showMapButton: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
    },
    showMapButtonText: {
        color: COLORS.textLight,
        fontSize: 16,
        fontWeight: 'bold',
    },
    disabledButton: {
        backgroundColor: COLORS.textSecondary,
        opacity: 0.6,
    },
    mapButtonsContainer: {
        position: 'absolute',
        top: 15,
        right: 5,
        backgroundColor: 'rgba(0,0,0,0.8)',
        borderRadius: 50,
        padding: 6,
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        flexDirection: 'row',
    },
    mapActionButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 5,
    },
    mapActionButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    offlineDownloadButton: {
        backgroundColor: COLORS.primary,
        padding: 15,
        marginHorizontal: 10,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 10,
    },
    offlineDownloadButtonText: {
        color: COLORS.textLight,
        fontSize: 16,
        fontWeight: 'bold',
    },
    modalText: {
        color: COLORS.text,
        fontSize: 16,
        marginBottom: 20,
        textAlign: 'center',
    },
    progressBar: {
        width: '100%',
        height: 20,
    },
    progressContainer: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    progressText: {
        color: COLORS.text,
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 10,
    },
    progressNumbers: {
        color: COLORS.textSecondary,
        fontSize: 14,
        marginBottom: 15,
    },
    progressBarContainer: {
        width: '100%',
        height: 8,
        backgroundColor: COLORS.background,
        borderRadius: 4,
        marginBottom: 10,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: COLORS.accent,
        borderRadius: 4,
    },
    progressPercentage: {
        color: COLORS.text,
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
    },
    loadingIndicator: {
        marginTop: 10,
    },
    offlineControls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        paddingVertical: 10,
        backgroundColor: COLORS.card,
        marginHorizontal: 10,
        borderRadius: 8,
        marginBottom: 10,
        gap: 10,
    },
    offlineButton: {
        flex: 1,
        backgroundColor: COLORS.background,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    offlineButtonActive: {
        backgroundColor: COLORS.accent,
        borderColor: COLORS.accent,
    },
    offlineButtonText: {
        color: COLORS.text,
        fontSize: 14,
        fontWeight: 'bold',
    },
    downloadButton: {
        flex: 1,
        backgroundColor: COLORS.secondary,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    downloadButtonDisabled: {
        backgroundColor: COLORS.textSecondary,
        opacity: 0.6,
    },
    downloadButtonText: {
        color: COLORS.text,
        fontSize: 14,
        fontWeight: 'bold',
    },
    photosContainer: {
        marginVertical: 8,
    },
    photosLabel: {
        fontSize: 14,
        color: COLORS.text,
        marginBottom: 5,
        fontWeight: '500',
    },
    photosScrollView: {
        flexDirection: 'row',
    },
    photoThumbnail: {
        marginRight: 8,
    },
    thumbnailImage: {
        width: 60,
        height: 60,
        borderRadius: 8,
        backgroundColor: COLORS.lightGray,
    },

    // Estilos para input de fotos
    photosInputContainer: {
        marginTop: 8,
    },
    photoPreviewContainer: {
        position: 'relative',
        marginRight: 10,
    },
    photoPreview: {
        width: 80,
        height: 80,
        borderRadius: 8,
        backgroundColor: COLORS.lightGray,
    },
    removePhotoButton: {
        position: 'absolute',
        top: -5,
        right: -5,
        backgroundColor: COLORS.error,
        borderRadius: 12,
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    removePhotoText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    addPhotoButton: {
        width: 80,
        height: 80,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: COLORS.accent,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    addPhotoText: {
        fontSize: 30,
        color: COLORS.accent,
        fontWeight: '300',
    },
    photoHelper: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginTop: 5,
        fontStyle: 'italic',
    },

    // Estilos para cámara
    cameraContainer: {
        flex: 1,
        position: 'relative',
    },
    camera: {
        flex: 1,
    },
    cameraButtonsContainer: {
        position: 'absolute',
        bottom: 20,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
    },
    closeCameraButton: {
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: 10,
        borderRadius: 5,
    },
    closeCameraText: {
        color: 'white',
        fontSize: 18,
    },
    captureButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    captureButtonInner: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'white',
    },
    photoConfirmOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    photoConfirmContent: {
        width: width * 0.9,
        alignItems: 'center',
    },
    photoPreviewLarge: {
        width: width * 0.8,
        height: height * 0.6,
        borderRadius: 10,
        marginBottom: 20,
    },
    photoConfirmButtons: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
    },

    // Estilos para visor de imágenes
    imageViewerOverlay: {
        flex: 1,
        backgroundColor: 'black',
    },
    closeImageViewer: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 1,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 25,
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeImageViewerText: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
    },
    imageScrollView: {
        width: width,
        height: height,
    },
    fullScreenImage: {
        width: width,
        height: height,
    },
    imageCounter: {
        position: 'absolute',
        bottom: 50,
        alignSelf: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
    },
    imageCounterText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '500',
    },
    locationOptionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    locationOptionButton: {
        flex: 1,
        backgroundColor: COLORS.accent,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginHorizontal: 4,
    },
    locationOptionText: {
        color: COLORS.text,
        fontSize: 14,
        fontWeight: '600',
    },
    manualLocationModalContent: {
        backgroundColor: COLORS.background,
        padding: 20,
        borderRadius: 12,
        width: '90%',
        height: '80%',
    },
    manualMap: {
        width: '100%',
        height: '70%',
        borderRadius: 8,
        marginBottom: 16,
    },
    manualLocationButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    markHereButton: {
        backgroundColor: COLORS.success,
        padding: 12,
        borderRadius: 8,
        flex: 1,
        marginRight: 8,
        alignItems: 'center',
    },
    markHereButtonText: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: '600',
    },
    cancelManualButton: {
        backgroundColor: COLORS.danger,
        padding: 12,
        borderRadius: 8,
        flex: 1,
        marginLeft: 8,
        alignItems: 'center',
    },
    cancelManualButtonText: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: '600',
    },
    manualMapContainer: {
        position: 'relative',
    },
    manualMapButtons: {
        position: 'absolute',
        bottom: 20,
        right: 10,
    },
    mapTypeButton: {
        backgroundColor: COLORS.background,
        padding: 8,
        borderRadius: 5,
        elevation: 2,
    },
    mapTypeButtonText: {
        color: COLORS.text,
        fontSize: 14,
    },
});

export default RouteManager;