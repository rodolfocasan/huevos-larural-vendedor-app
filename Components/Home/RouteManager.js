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
    Image,
    Linking
} from "react-native";
import * as Location from "expo-location";
import MapView, { Marker, Polyline, UrlTile } from 'react-native-maps';
import { CameraView, CameraType, Camera } from 'expo-camera';
import NetInfo from '@react-native-community/netinfo';
import { FontAwesome, FontAwesome5, Ionicons, Feather } from '@expo/vector-icons';

import { COLORS, formatTime, formatDate, ONLINE_TILE_URL } from "../Utils/Constants";





// Dimensiones de la pantalla
const { width, height } = Dimensions.get("window");

// Componente para gestionar la ruta de ventas y clientes
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
    const [mapRef, setMapRef] = useState(null); // Referencia al mapa

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

    // Estado para la conectividad
    const [isConnected, setIsConnected] = useState(true); // Estado de conexión a internet

    // Estados para el modal de confirmación de contacto
    const [confirmModalVisible, setConfirmModalVisible] = useState(false);
    const [pendingAction, setPendingAction] = useState(null);
    const [actionService, setActionService] = useState('');

    // Estados para agrupación de clientes
    const [selectedGroup, setSelectedGroup] = useState('todos'); // 'todos' o ID del grupo
    const [groupModalVisible, setGroupModalVisible] = useState(false);
    const [groupMethodModalVisible, setGroupMethodModalVisible] = useState(false);
    const [editingGroupId, setEditingGroupId] = useState(null);
    const [groupNameInput, setGroupNameInput] = useState('');
    const [groupNameModalVisible, setGroupNameModalVisible] = useState(false);
    const [changeGroupModalVisible, setChangeGroupModalVisible] = useState(false);
    const [selectedClientForGroupChange, setSelectedClientForGroupChange] = useState(null);

    // Función para mostrar el modal de confirmación de contacto
    const showConfirmModal = (action, service) => {
        setPendingAction(() => action);
        setActionService(service);
        setConfirmModalVisible(true);
    };

    // Función para agrupar clientes por ubicación
    const groupClientsByLocation = () => {
        const clientsWithLocation = pendingClients.filter(client => client.location);
        const groups = [];
        const usedClients = new Set();

        clientsWithLocation.forEach(client => {
            if (usedClients.has(client.id)) return;

            const group = {
                id: `group_${groups.length + 1}`,
                name: `Grupo ${groups.length + 1}`,
                clients: [client.id]
            };
            usedClients.add(client.id);

            // Buscar clientes cercanos (dentro de 1km aproximadamente)
            clientsWithLocation.forEach(otherClient => {
                if (usedClients.has(otherClient.id)) return;

                const distance = getDistanceBetweenPoints(
                    client.location.latitude,
                    client.location.longitude,
                    otherClient.location.latitude,
                    otherClient.location.longitude
                );

                if (distance < 1000) { // 1km en metros
                    group.clients.push(otherClient.id);
                    usedClients.add(otherClient.id);
                }
            });

            groups.push(group);
        });

        // Actualizar los clientes con sus grupos
        const updatedClients = clients.map(client => {
            const group = groups.find(g => g.clients.includes(client.id));
            return {
                ...client,
                groupId: group ? group.id : null
            };
        });

        // Guardar grupos en la venta
        const updatedSale = {
            ...sale,
            clients: updatedClients,
            clientGroups: groups
        };

        updateSale(updatedSale);
        setGroupMethodModalVisible(false);
    };

    // Función para calcular la distancia entre dos puntos
    const getDistanceBetweenPoints = (lat1, lon1, lat2, lon2) => {
        const R = 6371e3; // Radio de la Tierra en metros
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c; // Distancia en metros
    };

    // Función para cambiar el grupo de un cliente
    const changeClientGroup = (clientId, groupId) => {
        const updatedClients = clients.map(client => {
            if (client.id === clientId) {
                return {
                    ...client,
                    groupId: groupId
                };
            }
            return client;
        });

        const updatedSale = {
            ...sale,
            clients: updatedClients
        };

        updateSale(updatedSale);
    };

    // Función para abrir el modal de cambio de grupo
    const openChangeGroupModal = (client) => {
        setSelectedClientForGroupChange(client);
        setChangeGroupModalVisible(true);
    };

    // Función para manejar el cambio de grupo de un cliente
    const handleChangeClientGroup = (groupId) => {
        if (selectedClientForGroupChange) {
            changeClientGroup(selectedClientForGroupChange.id, groupId);
            setChangeGroupModalVisible(false);
            setSelectedClientForGroupChange(null);
        }
    };

    // Función para renombrar un grupo
    const renameGroup = (groupId, newName) => {
        const updatedGroups = (sale.clientGroups || []).map(group => {
            if (group.id === groupId) {
                return {
                    ...group,
                    name: newName
                };
            }
            return group;
        });

        const updatedSale = {
            ...sale,
            clientGroups: updatedGroups
        };

        updateSale(updatedSale);
    };

    // Función para obtener clientes filtrados por grupo
    const getFilteredClients = () => {
        if (selectedGroup === 'todos') {
            return currentClients;
        }
        return currentClients.filter(client => client.groupId === selectedGroup);
    };

    // Obtener grupos disponibles
    const availableGroups = sale.clientGroups || [];

    // Función para confirmar la acción de contacto
    const handleConfirmAction = () => {
        if (pendingAction) {
            pendingAction();
        }
        setConfirmModalVisible(false);
        setPendingAction(null);
        setActionService('');
    };

    // Función para cancelar la acción de contacto
    const handleCancelAction = () => {
        setConfirmModalVisible(false);
        setPendingAction(null);
        setActionService('');
    };

    // Efecto para verificar cambios en los clientes
    useEffect(() => {
        console.log('Clientes actualizados en RouteManager:', sale.clients);
    }, [sale.clients]);

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
    const confirmedClients = clients.filter(client => client.status === "confirmed");
    const pendingClients = clients.filter(client => client.status === "pending");

   // Inicializar clientes si no existen
    const currentClients = (activeClientTab === 'confirmed' ? confirmedClients : pendingClients)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Función para solicitar permisos de cámara
    const requestCameraPermissions = async () => {
        try {
            const { status: existingStatus } = await Camera.getCameraPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await Camera.requestCameraPermissionsAsync();
                finalStatus = status;
            }

            setCameraPermission(finalStatus === 'granted');

            if (finalStatus !== 'granted') {
                Alert.alert(
                    'Permisos requeridos',
                    'Se necesitan permisos de cámara para tomar fotos.',
                    [{ text: 'OK' }]
                );
            }
        } catch (error) {
            console.error('Error al solicitar permisos de cámara:', error);
            Alert.alert('Error', 'No se pudieron solicitar los permisos de cámara.');
        }
    };

    // Verificar GPS, permisos y conectividad al cargar el componente
    useEffect(() => {
        checkGPSAndPermissions();
        requestCameraPermissions();

        // Suscribirse a cambios de conectividad
        const unsubscribe = NetInfo.addEventListener(state => {
            const connected = state.isConnected && state.isInternetReachable;
            setIsConnected(connected);
        });

        // Verificar conectividad inicial
        NetInfo.fetch().then(state => {
            const connected = state.isConnected && state.isInternetReachable;
            setIsConnected(connected);
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

    // Función para verificar GPS y permisos de ubicación
    const checkGPSAndPermissions = async () => {
        try {
            const gpsStatus = await Location.hasServicesEnabledAsync();
            setGpsEnabled(gpsStatus);

            if (!gpsStatus) {
                Alert.alert(
                    "GPS Deshabilitado",
                    "Por favor, habilite el GPS para usar las funciones de ubicación.",
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

    // Función para mostrar el mapa con verificaciones de GPS y conexión
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

        if (!isConnected) {
            Alert.alert(
                "Sin conexión",
                "No hay conexión a internet. No se puede mostrar el mapa."
            );
            return;
        }

        try {
            setIsTrackingLocation(true);
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });
            const { latitude, longitude } = location.coords;
            setUserLocation({ latitude, longitude });

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

    // Función para obtener la ubicación actual del usuario
    const getCurrentLocation = async () => {
        if (!locationPermission) {
            Alert.alert("Error", "No se tienen permisos de ubicación");
            return;
        }

        setIsLoadingLocation(true);
        try {
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
                timeout: 15000,
            });

            const { latitude, longitude } = location.coords;
            let address = `Coordenadas: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

            if (isConnected) {
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
                "No se pudo obtener la ubicación. Verifique GPS y permisos."
            );
        } finally {
            setIsLoadingLocation(false);
        }
    };

    // Función para resetear el formulario de cliente
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
        return (num * 2) % 1 === 0;
    };

    // Función para agregar un nuevo cliente
    const addClient = () => {
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

        const newClient = {
            id: Date.now().toString(),
            name: clientForm.name.trim(),
            contact: clientForm.contact.trim(),
            quantity: parseFloat(clientForm.quantity),
            location: clientForm.location || null,
            address: clientForm.address || "Ubicación no especificada",
            status: "pending",
            photos: clientForm.photos || [],
            createdAt: new Date().toISOString(),
        };

        const updatedClients = [...clients, newClient];
        const updatedSale = { ...sale, clients: updatedClients };

        updateSale(updatedSale);
        setClientModalVisible(false);
        resetForm();
    };

    // Función para cambiar el estado de un cliente
    const toggleClientStatus = (clientId) => {
        const updatedClients = clients.map(client => {
            if (client.id === clientId) {
                return {
                    ...client,
                    status: client.status === "pending" ? "confirmed" : "pending",
                    confirmedAt: client.status === "pending" ? new Date().toISOString() : null,
                };
            }
            return client;
        });

        const updatedSale = { ...sale, clients: updatedClients };
        updateSale(updatedSale);
    };

    // Función para abrir el modal de edición de cliente
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

    // Función para actualizar un cliente existente
    const updateClient = () => {
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

        const updatedClients = clients.map(client => {
            if (client.id === editingClient.id) {
                return {
                    ...client,
                    name: clientForm.name.trim(),
                    contact: clientForm.contact.trim(),
                    quantity: parseFloat(clientForm.quantity),
                    location: clientForm.location || null,
                    address: clientForm.address || "Ubicación no especificada",
                    photos: clientForm.photos || [],
                    updatedAt: new Date().toISOString(),
                };
            }
            return client;
        });

        const updatedSale = { ...sale, clients: updatedClients };
        updateSale(updatedSale);
        setEditModalVisible(false);
        setEditingClient(null);
        resetForm();
    };

    // Función para eliminar un cliente
    const deleteClient = (clientId) => {
        Alert.alert(
            "Eliminar cliente permanentemente",
            "⚠️ Esta acción no se puede deshacer. ¿Está seguro?",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Eliminar",
                    style: "destructive",
                    onPress: () => {
                        const updatedClients = clients.filter(client => client.id !== clientId);
                        const updatedSale = { ...sale, clients: updatedClients };
                        updateSale(updatedSale);
                    },
                },
            ]
        );
    };

    // Función para marcar un pedido como entregado
    const markAsDelivered = (clientId) => {
        Alert.alert(
            "Confirmar entrega",
            "El pedido se registrará como entregado y regresará a pendientes.",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Aceptar",
                    onPress: () => {
                        const client = clients.find(c => c.id === clientId);
                        if (!client) return;

                        const total = client.quantity * eggsPrice * 12; // Suponiendo 12 cartones por caja
                        const transaction = {
                            id: Date.now().toString(),
                            type: 'route',
                            quantity: client.quantity,
                            unitPrice: eggsPrice * 12,
                            total,
                            receivedMoney: {},
                            totalReceived: total,
                            change: 0,
                            location: client.address,
                            saleType: "Ruta",
                            timestamp: new Date().toISOString(),
                        };

                        const updatedClients = clients.map(c => {
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

    // Función para cancelar un pedido confirmado
    const cancelConfirmedOrder = (clientId) => {
        Alert.alert(
            "Cancelar pedido",
            "El pedido se cancelará y regresará a pendientes.",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Aceptar",
                    style: "destructive",
                    onPress: () => {
                        const updatedClients = clients.map(client => {
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
                        const updatedSale = { ...sale, clients: updatedClients };
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

    // Generar coordenadas para la ruta (líneas entre ubicaciones)
    const generateRouteCoordinates = () => {
        const coordinates = [];

        if (userLocation) {
            coordinates.push(userLocation);
        }

        confirmedClients.forEach(client => {
            if (client.location) {
                coordinates.push({
                    latitude: client.location.latitude,
                    longitude: client.location.longitude,
                });
            }
        });

        return coordinates;
    };

    // Verificar si el contacto es un número de teléfono
    const isPhoneNumber = (contact) => {
        if (typeof contact !== 'string') return false;
        return /^[+]?[\d]+$/.test(contact.replace(/\s/g, ''));
    };

    // Renderizar el modal de confirmación de contacto
    const renderConfirmModal = () => (
        <Modal
            animationType="fade"
            transparent={true}
            visible={confirmModalVisible}
            onRequestClose={handleCancelAction}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.confirmModalContent}>
                    <Text style={styles.confirmModalText}>
                        Está a punto de usar {actionService} con el cliente. ¿Desea continuar?
                    </Text>
                    <View style={styles.confirmModalButtons}>
                        <TouchableOpacity
                            style={[styles.modalButton, styles.cancelButton]}
                            onPress={handleCancelAction}
                        >
                            <Text style={styles.modalButtonText}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.modalButton, styles.confirmButton]}
                            onPress={handleConfirmAction}
                        >
                            <Text style={styles.modalButtonText}>Aceptar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    // Renderizar cada item de cliente
    const renderClientItem = (client, index) => {
        const clientGroup = availableGroups.find(g => g.id === client.groupId);

        return (
            <View key={client.id} style={styles.clientItem}>
                <View style={styles.clientHeader}>
                    <Text style={styles.clientName}>{client.name}</Text>
                    <Text style={styles.clientQuantity}>{client.quantity} cajas</Text>
                </View>

                <View style={styles.clientDetails}>
                    <Text style={styles.clientContact}>📞 {client.contact}</Text>
                    <Text style={styles.clientAddress}>📍 {client.address}</Text>
                    {client.createdAt && (
                        <Text style={styles.clientDate}>
                            📅 {formatDate(client.createdAt)} - {formatTime(client.createdAt)}
                        </Text>
                    )}
                </View>

                {activeClientTab === "pending" && (
                    <TouchableOpacity
                        style={styles.groupBadge}
                        onPress={() => openChangeGroupModal(client)}
                    >
                        <Text style={styles.groupBadgeText}>
                            Grupo: {clientGroup?.name || "Sin agrupar"}
                        </Text>
                    </TouchableOpacity>
                )}

                {isPhoneNumber(client.contact) && (
                    <View style={styles.contactActions}>
                        <TouchableOpacity
                            style={[styles.contactButton, styles.phoneButton]}
                            onPress={() => showConfirmModal(() => Linking.openURL(`tel:${client.contact}`), 'Teléfono')}
                        >
                            <Feather name="phone" size={24} color="white" />
                            <Text style={styles.contactButtonText}>Llamar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.contactButton, styles.whatsappButton]}
                            onPress={() => showConfirmModal(() => Linking.openURL(`whatsapp://send?phone=${client.contact}`), 'WhatsApp')}
                        >
                            <Ionicons name="logo-whatsapp" size={20} color="white" />
                            <Text style={styles.contactButtonText}>WhatsApp</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.contactButton, styles.telegramButton]}
                            onPress={() => showConfirmModal(() => Linking.openURL(`tg://resolve?domain=${client.contact}`), 'Telegram')}
                        >
                            <FontAwesome5 name="telegram" size={24} color="white" />
                            <Text style={styles.contactButtonText}>Telegram</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.quantityContainer}>
                    <Text style={styles.clientQuantity}>
                        📦 {client.quantity} {client.quantity === 1 ? 'caja' : 'cajas'}
                        (${(client.quantity * eggsPrice * 12).toFixed(2)})
                    </Text>
                </View>

                {client.photos && client.photos.length > 0 && (
                    <View style={styles.photosContainer}>
                        <Text style={styles.photosLabel}>📷 Fotografías de referencia:</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScrollView}>
                            {client.photos.map((photo, photoIndex) => (
                                <TouchableOpacity
                                    key={photoIndex}
                                    style={styles.photoThumbnail}
                                    onPress={() => openImageViewer(client.photos, photoIndex)}
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

                {client.confirmedAt && (
                    <Text style={styles.clientConfirmedDate}>
                        Confirmado: {formatDate(client.confirmedAt)} {formatTime(client.confirmedAt)}
                    </Text>
                )}

                {client.status === 'pending' ? (
                    <View style={styles.clientActionsContainer}>
                        <View style={styles.clientTopActions}>
                            <TouchableOpacity
                                style={styles.editButton}
                                onPress={() => openEditModal(client)}
                            >
                                <Text style={styles.editButtonText}>✏️ Editar información</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.confirmButton}
                                onPress={() => toggleClientStatus(client.id)}
                            >
                                <Text style={styles.confirmButtonText}>🔃 El cliente confirmó</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.clientBottomActions}>
                            <TouchableOpacity
                                style={styles.mapButton}
                                onPress={() => handleViewOnMap(client)}
                            >
                                <Text style={styles.mapButtonText}>🗺️ Ver en el mapa</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.deleteButton}
                                onPress={() => deleteClient(client.id)}
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
                                onPress={() => markAsDelivered(client.id)}
                            >
                                <Text style={styles.deliveredButtonText}>✅ Pedido entregado</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.cancelOrderButton}
                                onPress={() => cancelConfirmedOrder(client.id)}
                            >
                                <Text style={styles.cancelOrderButtonText}>❌ Pedido cancelado</Text>
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity
                            style={styles.mapButton}
                            onPress={() => handleViewOnMap(client)}
                        >
                            <Text style={styles.mapButtonText}>🗺️ Ver en el mapa</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    // Función para manejar "Ver en el mapa" con verificación de conexión
    const handleViewOnMap = (client) => {
        if (!client.location) {
            Alert.alert("Error", "Este cliente no tiene ubicación registrada");
            return;
        }

        if (!isConnected) {
            Alert.alert(
                "Sin conexión",
                "No hay conexión a internet. ¿Desea abrir la ubicación en Google Maps?",
                [
                    { text: "Cancelar", style: "cancel" },
                    {
                        text: "Abrir en Google Maps",
                        onPress: () => {
                            const url = `https://www.google.com/maps/search/?api=1&query=${client.location.latitude},${client.location.longitude}`;
                            Linking.openURL(url);
                        },
                    },
                ]
            );
            return;
        }

        if (!showMap) {
            Alert.alert(
                "Mapa desactivado",
                "Active la vista de mapa con el botón 'Mostrar Mapa' para ver la ubicación."
            );
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

    // Renderizar modal de cámara
    const renderCameraModal = () => (
        <Modal
            animationType="slide"
            transparent={false}
            visible={cameraVisible}
            onRequestClose={() => setCameraVisible(false)}
        >
            <View style={styles.cameraContainer}>
                <CameraView
                    style={styles.camera}
                    facing="back"
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

    // Renderizar modal de confirmación de foto
    const renderPhotoConfirmModal = () => (
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

    // Renderizar visor de imágenes en pantalla completa
    const renderImageViewer = () => (
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
                                urlTemplate={ONLINE_TILE_URL}
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
                                            Alert.alert("Sin conexión", "El modo satélite requiere internet.");
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
                                    if (isConnected) {
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

    // Renderizar modal de selección de grupo
    const renderGroupModal = () => (
        <Modal
            animationType="slide"
            transparent={true}
            visible={groupModalVisible}
            onRequestClose={() => setGroupModalVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Seleccionar Grupo</Text>
                    <ScrollView style={styles.groupList}>
                        <TouchableOpacity
                            style={[
                                styles.groupItem,
                                selectedGroup === 'todos' && styles.selectedGroupItem
                            ]}
                            onPress={() => {
                                setSelectedGroup('todos');
                                setGroupModalVisible(false);
                            }}
                        >
                            <Ionicons name="list" size={20} color={selectedGroup === 'todos' ? COLORS.white : COLORS.text} />
                            <Text style={[
                                styles.groupItemText,
                                selectedGroup === 'todos' && styles.selectedGroupItemText
                            ]}>
                                Todos los clientes
                            </Text>
                        </TouchableOpacity>
                        {availableGroups.map(group => (
                            <View key={group.id} style={styles.groupItemContainer}>
                                <TouchableOpacity
                                    style={[
                                        styles.groupItem,
                                        selectedGroup === group.id && styles.selectedGroupItem
                                    ]}
                                    onPress={() => {
                                        setSelectedGroup(group.id);
                                        setGroupModalVisible(false);
                                    }}
                                >
                                    <Ionicons name="location" size={20} color={selectedGroup === group.id ? COLORS.white : COLORS.text} />
                                    <Text style={[
                                        styles.groupItemText,
                                        selectedGroup === group.id && styles.selectedGroupItemText
                                    ]}>
                                        {group.name}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.editGroupButton}
                                    onPress={() => {
                                        setEditingGroupId(group.id);
                                        setGroupNameInput(group.name);
                                        setGroupNameModalVisible(true);
                                    }}
                                >
                                    <Ionicons name="pencil" size={20} color={COLORS.text} />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </ScrollView>
                    <TouchableOpacity
                        style={styles.closeModalButton}
                        onPress={() => setGroupModalVisible(false)}
                    >
                        <Text style={styles.closeModalButtonText}>Cerrar</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    // Renderizar modal de método de agrupación
    const renderGroupMethodModal = () => (
        <Modal
            animationType="slide"
            transparent={true}
            visible={groupMethodModalVisible}
            onRequestClose={() => setGroupMethodModalVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Método de Agrupación</Text>
                    <Text style={styles.modalSubtitle}>Seleccione cómo desea agrupar los clientes pendientes.</Text>
                    <TouchableOpacity
                        style={styles.groupMethodButton}
                        onPress={groupClientsByLocation}
                    >
                        <Ionicons name="location-outline" size={24} color={COLORS.white} style={styles.groupMethodIcon} />
                        <Text style={styles.groupMethodButtonText}>Agrupar por ubicación</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.closeModalButton}
                        onPress={() => setGroupMethodModalVisible(false)}
                    >
                        <Text style={styles.closeModalButtonText}>Cancelar</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    // Renderizar modal de edición de nombre de grupo
    const renderGroupNameModal = () => (
        <Modal
            animationType="slide"
            transparent={true}
            visible={groupNameModalVisible}
            onRequestClose={() => setGroupNameModalVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Editar nombre del grupo</Text>
                    <TextInput
                        style={styles.groupNameInput}
                        value={groupNameInput}
                        onChangeText={setGroupNameInput}
                        placeholder="Nombre del grupo"
                        maxLength={30}
                    />
                    <View style={styles.modalButtonsContainer}>
                        <TouchableOpacity
                            style={[styles.modalButton, styles.cancelButton]}
                            onPress={() => {
                                setGroupNameModalVisible(false);
                                setEditingGroupId(null);
                                setGroupNameInput('');
                            }}
                        >
                            <Text style={styles.modalButtonText}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.modalButton, styles.addButton]}
                            onPress={() => {
                                if (groupNameInput.trim() && editingGroupId) {
                                    renameGroup(editingGroupId, groupNameInput.trim());
                                    setGroupNameModalVisible(false);
                                    setEditingGroupId(null);
                                    setGroupNameInput('');
                                }
                            }}
                        >
                            <Text style={styles.modalButtonText}>Guardar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    // Renderizar modal de cambio de grupo
    const renderChangeGroupModal = () => (
        <Modal
            animationType="slide"
            transparent={true}
            visible={changeGroupModalVisible}
            onRequestClose={() => setChangeGroupModalVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Cambiar Grupo</Text>
                        <Text style={styles.modalSubtitle}>
                            {selectedClientForGroupChange?.name}
                        </Text>
                    </View>

                    <ScrollView style={styles.groupChangeList}>
                        <TouchableOpacity
                            style={[
                                styles.groupChangeItem,
                                !selectedClientForGroupChange?.groupId && styles.selectedGroupChangeItem
                            ]}
                            onPress={() => handleChangeClientGroup(null)}
                        >
                            <View style={styles.groupChangeItemContent}>
                                <Text style={styles.groupChangeItemIcon}>🏷️</Text>
                                <View style={styles.groupChangeItemTextContainer}>
                                    <Text style={[
                                        styles.groupChangeItemText,
                                        !selectedClientForGroupChange?.groupId && styles.selectedGroupChangeItemText
                                    ]}>
                                        Sin grupo
                                    </Text>
                                    <Text style={styles.groupChangeItemDescription}>
                                        Cliente individual
                                    </Text>
                                </View>
                                {!selectedClientForGroupChange?.groupId && (
                                    <Text style={styles.groupChangeItemCheck}>✓</Text>
                                )}
                            </View>
                        </TouchableOpacity>

                        {availableGroups.map(group => {
                            const isSelected = selectedClientForGroupChange?.groupId === group.id;
                            const clientsInGroup = clients.filter(c => c.groupId === group.id).length;

                            return (
                                <TouchableOpacity
                                    key={group.id}
                                    style={[
                                        styles.groupChangeItem,
                                        isSelected && styles.selectedGroupChangeItem
                                    ]}
                                    onPress={() => handleChangeClientGroup(group.id)}
                                >
                                    <View style={styles.groupChangeItemContent}>
                                        <Text style={styles.groupChangeItemIcon}>📍</Text>
                                        <View style={styles.groupChangeItemTextContainer}>
                                            <Text style={[
                                                styles.groupChangeItemText,
                                                isSelected && styles.selectedGroupChangeItemText
                                            ]}>
                                                {group.name}
                                            </Text>
                                            <Text style={styles.groupChangeItemDescription}>
                                                {clientsInGroup} cliente{clientsInGroup !== 1 ? 's' : ''}
                                            </Text>
                                        </View>
                                        {isSelected && (
                                            <Text style={styles.groupChangeItemCheck}>✓</Text>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    <View style={styles.modalButtonsContainer}>
                        <TouchableOpacity
                            style={[styles.modalButton, styles.cancelButton]}
                            onPress={() => {
                                setChangeGroupModalVisible(false);
                                setSelectedClientForGroupChange(null);
                            }}
                        >
                            <Text style={styles.modalButtonText}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    // Renderizado principal del componente
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
                            ref={setMapRef}
                            style={styles.map}
                            initialRegion={mapRegion}
                            mapType={mapType}
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
                            <UrlTile
                                urlTemplate={ONLINE_TILE_URL}
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
                                            Alert.alert("Sin conexión", "El modo satélite requiere internet.");
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
                        Total cajas programadas: {confirmedClients.reduce((sum, client) => sum + client.quantity, 0)}
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

                {activeClientTab === "pending" && (
                    <View style={styles.groupingSection}>
                        <View style={styles.groupingHeader}>
                            <TouchableOpacity
                                style={styles.groupSelector}
                                onPress={() => setGroupModalVisible(true)}
                            >
                                <Ionicons name="filter" size={20} color={COLORS.text} style={styles.groupSelectorIcon} />
                                <Text style={styles.groupSelectorText}>
                                    {selectedGroup === 'todos'
                                        ? 'Todos los clientes'
                                        : availableGroups.find(g => g.id === selectedGroup)?.name || 'Seleccionar grupo'
                                    }
                                </Text>
                                <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.groupButton}
                                onPress={() => setGroupMethodModalVisible(true)}
                            >
                                <Text style={styles.groupButtonText}>Agrupar clientes</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                <View style={styles.clientsContainer}>
                    {activeClientTab === "pending" ? (
                        getFilteredClients().length > 0 ? (
                            getFilteredClients().map((client, index) => renderClientItem(client, index))
                        ) : (
                            <Text style={styles.noDataText}>
                                {selectedGroup === 'todos'
                                    ? "No hay clientes pendientes"
                                    : "No hay clientes en este grupo"}
                            </Text>
                        )
                    ) : (
                        currentClients.length > 0 ? (
                            currentClients.map((client, index) => renderClientItem(client, index))
                        ) : (
                            <Text style={styles.noDataText}>
                                No hay clientes confirmados
                            </Text>
                        )
                    )}
                </View>
            </ScrollView>

            {renderClientModal()}
            {renderCameraModal()}
            {renderPhotoConfirmModal()}
            {renderImageViewer()}
            {renderManualLocationModal()}
            {renderEditModal()}
            {renderConfirmModal()}
            {renderGroupModal()}
            {renderGroupMethodModal()}
            {renderGroupNameModal()}
            {renderChangeGroupModal()}
        </View>
    );
};

// Estilos del componente
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    mainScrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 20,
    },
    loadingText: {
        color: COLORS.text,
        textAlign: "center",
        marginTop: 50,
        fontSize: 16,
    },
    mapContainer: {
        height: height * 0.4,
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
        backgroundColor: COLORS.card,
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
        color: COLORS.text,
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
    },
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
        backgroundColor: COLORS.error,
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
    contactActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 5,
    },
    contactButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 5,
        borderRadius: 5,
        minWidth: 100,
        justifyContent: 'center',
    },
    phoneButton: {
        backgroundColor: '#007AFF',
    },
    whatsappButton: {
        backgroundColor: '#25D366',
    },
    telegramButton: {
        backgroundColor: '#0088cc',
    },
    contactButtonText: {
        color: 'white',
        fontSize: 14,
        marginLeft: 5,
    },
    confirmModalContent: {
        backgroundColor: COLORS.card,
        padding: 20,
        borderRadius: 10,
        width: '80%',
        alignItems: 'center',
    },
    confirmModalText: {
        fontSize: 16,
        color: COLORS.text,
        textAlign: 'center',
        marginBottom: 20,
    },
    confirmModalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    quantityContainer: {
        marginTop: 30,
    },
    groupingSection: {
        marginBottom: 16,
        backgroundColor: COLORS.card,
        borderRadius: 8,
        padding: 12,
    },
    groupingHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
        minHeight: 60,
    },
    groupSelector: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    groupSelectorIcon: {
        marginRight: 8,
    },
    groupSelectorText: {
        color: COLORS.text,
        fontSize: 16,
        flex: 1,
    },
    groupButton: {
        backgroundColor: COLORS.accent,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 6,
        alignItems: 'center',
        minWidth: 120,
    },
    groupButtonText: {
        color: COLORS.white,
        fontSize: 14,
        fontWeight: 'bold',
    },
    groupList: {
        maxHeight: 300,
        marginVertical: 16,
    },
    groupItemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    groupItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        backgroundColor: COLORS.background,
        marginBottom: 8,
    },
    selectedGroupItem: {
        backgroundColor: COLORS.accent,
    },
    groupItemText: {
        color: COLORS.text,
        fontSize: 16,
        marginLeft: 8,
    },
    selectedGroupItemText: {
        color: COLORS.white,
    },
    editGroupButton: {
        marginLeft: 8,
        padding: 8,
    },
    groupMethodButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primary,
        padding: 16,
        borderRadius: 8,
        marginBottom: 12,
    },
    groupMethodIcon: {
        marginRight: 12,
    },
    groupMethodButtonText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: 'bold',
    },
    groupNameInput: {
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 6,
        padding: 12,
        fontSize: 16,
        backgroundColor: COLORS.background,
        color: COLORS.text,
        marginVertical: 16,
    },
    groupBadge: {
        alignSelf: 'flex-start',
        backgroundColor: COLORS.accent,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        marginTop: 8,
    },
    groupBadgeText: {
        color: COLORS.white,
        fontSize: 12,
        fontWeight: 'bold',
    },
    closeModalButton: {
        backgroundColor: COLORS.textSecondary,
        padding: 12,
        borderRadius: 6,
        alignItems: 'center',
        marginTop: 16,
    },
    closeModalButtonText: {
        color: COLORS.white,
        fontSize: 14,
        fontWeight: 'bold',
    },
    modalHeader: {
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        paddingBottom: 15,
    },
    modalSubtitle: {
        color: COLORS.textSecondary,
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 20,
    },
    groupChangeList: {
        maxHeight: 300,
        marginBottom: 20,
    },
    groupChangeItem: {
        backgroundColor: COLORS.card,
        borderRadius: 8,
        marginBottom: 10,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    selectedGroupChangeItem: {
        borderColor: COLORS.accent,
        backgroundColor: COLORS.accent + '20',
    },
    groupChangeItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
    },
    groupChangeItemIcon: {
        fontSize: 20,
        marginRight: 15,
    },
    groupChangeItemTextContainer: {
        flex: 1,
    },
    groupChangeItemText: {
        fontSize: 16,
        color: COLORS.text,
        fontWeight: '500',
    },
    selectedGroupChangeItemText: {
        color: COLORS.accent,
        fontWeight: '600',
    },
    groupChangeItemDescription: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    groupChangeItemCheck: {
        fontSize: 18,
        color: COLORS.accent,
        fontWeight: 'bold',
    },
});

export default RouteManager;