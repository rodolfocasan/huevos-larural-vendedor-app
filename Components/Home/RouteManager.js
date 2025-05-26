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
} from "react-native";
import * as Location from "expo-location";
import MapView, { Marker, Polyline } from "react-native-maps";

import { COLORS, formatTime, formatDate } from "../Utils/Constants";





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

    // Estados para el mapa
    const [mapRegion, setMapRegion] = useState({
        latitude: 14.0723, // Coordenadas por defecto (El Salvador)
        longitude: -87.1921,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
    });
    const [userLocation, setUserLocation] = useState(null);
    const [isTrackingLocation, setIsTrackingLocation] = useState(false);

    // Estados del formulario de cliente
    const [clientForm, setClientForm] = useState({
        name: "",
        contact: "",
        quantity: "",
        location: null,
        address: "",
        status: "pending", // 'pending' o 'confirmed'
    });

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

    // Solicitar permisos de ubicación al cargar el componente
    useEffect(() => {
        requestLocationPermission();
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

                            // Actualizar región del mapa si es la primera vez
                            if (!currentLocation) {
                                setMapRegion({
                                    latitude,
                                    longitude,
                                    latitudeDelta: 0.01,
                                    longitudeDelta: 0.01,
                                });
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
    }, [locationPermission, isTrackingLocation]);

    // Función para solicitar permisos de ubicación
    const requestLocationPermission = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            setLocationPermission(status === "granted");

            if (status === "granted") {
                setIsTrackingLocation(true);
                // Obtener ubicación inicial
                const location = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.High,
                });
                const { latitude, longitude } = location.coords;
                setUserLocation({ latitude, longitude });
                setMapRegion({
                    latitude,
                    longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                });
            } else {
                Alert.alert(
                    "Permisos requeridos",
                    "Se necesitan permisos de ubicación para mostrar la ruta en el mapa."
                );
            }
        } catch (error) {
            console.error("Error al solicitar permisos de ubicación:", error);
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
            });

            const { latitude, longitude } = location.coords;

            // Obtener dirección aproximada usando geocodificación inversa
            const addressResponse = await Location.reverseGeocodeAsync({
                latitude,
                longitude,
            });

            let address = "Ubicación no disponible";
            if (addressResponse.length > 0) {
                const addr = addressResponse[0];
                address = `${addr.street || ""} ${addr.streetNumber || ""}, ${addr.city || ""
                    }, ${addr.region || ""}`.trim();
            }

            setCurrentLocation({ latitude, longitude });
            setClientForm((prev) => ({
                ...prev,
                location: { latitude, longitude },
                address: address,
            }));
        } catch (error) {
            console.error("Error al obtener ubicación:", error);
            Alert.alert("Error", "No se pudo obtener la ubicación actual");
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
        });
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

        if (!clientForm.location) {
            Alert.alert(
                "Error",
                'Se requiere la ubicación. Presiona "Obtener Ubicación"'
            );
            return;
        }

        // Crear nuevo cliente
        const newClient = {
            id: Date.now().toString(),
            name: clientForm.name.trim(),
            contact: clientForm.contact.trim(),
            quantity: parseFloat(clientForm.quantity),
            location: clientForm.location,
            address: clientForm.address,
            status: "pending",
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

        if (!clientForm.location) {
            Alert.alert(
                "Error",
                'Se requiere la ubicación. Presiona "Obtener Ubicación"'
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
                    location: clientForm.location,
                    address: clientForm.address,
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
            "Confirmar eliminación",
            "¿Estás seguro de que deseas eliminar este cliente?",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Eliminar",
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
            "Se registrará que el pedido ha sido entregado al cliente sin problemas.",
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

                        // Actualizar el cliente a delivered
                        const updatedClients = clients.map((c) => {
                            if (c.id === clientId) {
                                return {
                                    ...c,
                                    status: "delivered",
                                    deliveredAt: new Date().toISOString(),
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
            "El pedido ha sido cancelado por el cliente y se removerá de la sección de confirmados.",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Aceptar",
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

    // Función para centrar el mapa en la ubicación del usuario
    const centerMapOnUser = () => {
        if (userLocation) {
            setMapRegion({
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            });
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
                            style={styles.statusButton}
                            onPress={() => toggleClientStatus(item.id)}
                        >
                            <Text style={styles.statusButtonText}>🔄 Pendiente</Text>
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => deleteClient(item.id)}
                    >
                        <Text style={styles.deleteButtonText}>× Eliminar cliente</Text>
                    </TouchableOpacity>
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
                            <Text style={styles.inputLabel}>Ubicación:</Text>
                            <TouchableOpacity
                                style={[
                                    styles.locationButton,
                                    isLoadingLocation && styles.locationButtonLoading,
                                ]}
                                onPress={getCurrentLocation}
                                disabled={isLoadingLocation}
                            >
                                {isLoadingLocation ? (
                                    <ActivityIndicator color={COLORS.text} />
                                ) : (
                                    <Text style={styles.locationButtonText}>
                                        {clientForm.location
                                            ? "✓ Ubicación obtenida"
                                            : "📍 Obtener ubicación"}
                                    </Text>
                                )}
                            </TouchableOpacity>
                            {clientForm.address && (
                                <Text style={styles.addressText}>{clientForm.address}</Text>
                            )}
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
                            <Text style={styles.inputLabel}>Ubicación:</Text>
                            <TouchableOpacity
                                style={[
                                    styles.locationButton,
                                    isLoadingLocation && styles.locationButtonLoading
                                ]}
                                onPress={getCurrentLocation}
                                disabled={isLoadingLocation}
                            >
                                {isLoadingLocation ? (
                                    <ActivityIndicator color={COLORS.text} />
                                ) : (
                                    <Text style={styles.locationButtonText}>
                                        {clientForm.location ? '✓ Ubicación obtenida' : '📍 Obtener ubicación'}
                                    </Text>
                                )}
                            </TouchableOpacity>
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

    // Obtener la lista de clientes actual según la pestaña activa
    const currentClients = activeClientTab === 'confirmed' ? confirmedClients : pendingClients;

    return (
        <View style={styles.container}>
            <ScrollView
                style={styles.mainScrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Mapa de la ruta */}
                <View style={styles.mapContainer}>
                    <MapView
                        style={styles.map}
                        region={mapRegion}
                        onRegionChangeComplete={setMapRegion}
                        mapType="standard" // Usar OpenStreetMap como base
                        showsUserLocation={true}
                        showsMyLocationButton={false}
                        followsUserLocation={false}
                    >
                        {/* Marcador para la ubicación del usuario */}
                        {userLocation && (
                            <Marker
                                coordinate={userLocation}
                                title="Tu ubicación"
                                description="Ubicación actual"
                                pinColor="blue"
                            />
                        )}

                        {/* Marcadores para clientes confirmados */}
                        {confirmedClients.map(
                            (client, index) =>
                                client.location && (
                                    <Marker
                                        key={`confirmed-${client.id}`}
                                        coordinate={{
                                            latitude: client.location.latitude,
                                            longitude: client.location.longitude,
                                        }}
                                        title={client.name || "Cliente"}
                                        description={`${client.quantity || 0} cajas - Confirmado`}
                                        pinColor="green"
                                        onPress={() => {
                                            // Prevenir bloqueo con un handler vacío controlado
                                            console.log(`Marcador confirmado presionado: ${client.name}`);
                                        }}
                                    />
                                )
                        )}

                        {/* Marcadores para clientes pendientes */}
                        {pendingClients.map(
                            (client, index) =>
                                client.location && (
                                    <Marker
                                        key={`pending-${client.id}`}
                                        coordinate={{
                                            latitude: client.location.latitude,
                                            longitude: client.location.longitude,
                                        }}
                                        title={client.name || "Cliente"}
                                        description={`${client.quantity || 0} cajas - Pendiente`}
                                        pinColor="orange"
                                        onPress={() => {
                                            // Prevenir bloqueo con un handler vacío controlado
                                            console.log(`Marcador pendiente presionado: ${client.name}`);
                                        }}
                                    />
                                )
                        )}

                        {/* Polyline para mostrar la ruta */}
                        {generateRouteCoordinates().length > 1 && (
                            <Polyline
                                coordinates={generateRouteCoordinates()}
                                strokeColor={COLORS.accent}
                                strokeWidth={3}
                                lineDashPattern={[5, 5]}
                            />
                        )}
                    </MapView>

                    {/* Botón para centrar en ubicación del usuario */}
                    <TouchableOpacity
                        style={styles.centerButton}
                        onPress={centerMapOnUser}
                    >
                        <Text style={styles.centerButtonText}>📍</Text>
                    </TouchableOpacity>
                </View>

                {/* Resumen de la ruta */}
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

                {/* Navegación de pestañas de clientes */}
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

                {/* Botón para agregar cliente */}
                <TouchableOpacity
                    style={styles.addClientButton}
                    onPress={() => setClientModalVisible(true)}
                >
                    <Text style={styles.addClientButtonText}>(+) Agregar Cliente</Text>
                </TouchableOpacity>

                {/* Lista de clientes renderizada directamente */}
                <View style={styles.clientsContainer}>
                    {currentClients.length > 0 ? (
                        currentClients.map((client, index) =>
                            renderClientItem(client, index)
                        )
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
    },
    centerButton: {
        position: "absolute",
        bottom: 20,
        right: 20,
        backgroundColor: COLORS.accent,
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: "center",
        alignItems: "center",
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    centerButtonText: {
        fontSize: 20,
        color: COLORS.text,
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
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: "center",
        alignItems: "center",
    },
    deleteButtonText: {
        color: COLORS.text,
        fontSize: 18,
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
    statusButton: {
        backgroundColor: COLORS.warning,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        flex: 1,
    },
    statusButtonText: {
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
    deleteButton: {
        backgroundColor: COLORS.error,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        alignItems: 'center',
    },
    deleteButtonText: {
        color: COLORS.text,
        fontSize: 12,
        fontWeight: 'bold',
    },
});

export default RouteManager;
