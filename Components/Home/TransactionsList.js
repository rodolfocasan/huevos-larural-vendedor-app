// Components/Home/TransactionsList.js
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { COLORS, formatDate } from '../Utils/Constants';

// Formateo de hora modificado para añadir ceros a la izquierda
const formatTime = (date) => {
    const d = new Date(date);
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const seconds = d.getSeconds().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';

    hours = hours % 12;
    hours = hours ? hours : 12; // la hora '0' debe ser '12'
    const formattedHours = hours.toString().padStart(2, '0'); // Añadir el cero para números de un solo dígito

    return `${formattedHours}:${minutes}:${seconds} ${ampm}`;
};





// Componente para mostrar la lista de transacciones
const TransactionsList = ({ transactions, sale }) => {
    // Verificación si no hay transacciones
    if (!transactions || transactions.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No hay transacciones registradas</Text>
            </View>
        );
    }

    // Calcular el total de ventas
    const totalSales = transactions.reduce((sum, transaction) => sum + transaction.total, 0);
    const [menuOpen, setMenuOpen] = React.useState(false);

    // Función para ordenar transacciones con las más recientes primero
    const sortedTransactions = [...transactions].sort((a, b) => {
        return new Date(b.timestamp) - new Date(a.timestamp);
    });

    // Función para generar el contenido HTML del PDF
    const generatePDFContent = () => {
        const creationDate = formatDate(sale.createdAt);
        const creationTime = formatTime(sale.createdAt);

        // Cabecera del PDF
        let htmlContent = `
        <html>
        <head>
            <style>
                body {
                    font-family: 'Helvetica', sans-serif;
                    margin: 0;
                    padding: 40px;
                    color: #333;
                    line-height: 1.5;
                }
                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 40px;
                    border-bottom: 2px solid #007bff;
                    padding-bottom: 20px;
                }
                .logo {
                    font-size: 28px;
                    font-weight: bold;
                    color: #007bff;
                }
                .sale-info {
                    text-align: right;
                    font-size: 14px;
                }
                .sale-info .sale-name {
                    font-size: 18px;
                    font-weight: bold;
                    margin-bottom: 5px;
                }
                .section-header {
                    background-color: #f8f9fa;
                    padding: 12px 15px;
                    margin: 30px 0 15px 0;
                    border-left: 5px solid #007bff;
                    font-size: 18px;
                    font-weight: bold;
                }
                .transaction-item {
                    margin-bottom: 25px;
                    padding: 15px;
                    border: 1px solid #e9ecef;
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                    page-break-inside: avoid;
                }
                .transaction-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 12px;
                    padding-bottom: 8px;
                    border-bottom: 1px solid #e9ecef;
                }
                .transaction-title {
                    font-weight: bold;
                    font-size: 16px;
                    color: #007bff;
                }
                .transaction-date {
                    color: #6c757d;
                    font-size: 14px;
                }
                .details-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 15px;
                }
                .details-table td {
                    padding: 8px 5px;
                    vertical-align: top;
                }
                .details-table td:first-child {
                    width: 40%;
                    text-align: left;
                    color: #6c757d;
                }
                .details-table td:last-child {
                    width: 60%;
                    text-align: right;
                    font-weight: 500;
                }
                .bills-details {
                    background-color: #f8f9fa;
                    border-radius: 5px;
                    padding: 10px;
                    margin-top: 10px;
                }
                .bills-header {
                    font-weight: 500;
                    margin-bottom: 8px;
                    color: #495057;
                }
                .bills-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
                    gap: 8px;
                }
                .bill-item {
                    background-color: #ffffff;
                    border: 1px solid #dee2e6;
                    border-radius: 4px;
                    padding: 5px 8px;
                    text-align: center;
                }
                .expenses-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 15px 0;
                }
                .expenses-table th {
                    background-color: #f8f9fa;
                    text-align: left;
                    padding: 10px;
                    font-weight: 500;
                    border-bottom: 2px solid #dee2e6;
                }
                .expenses-table td {
                    padding: 12px 10px;
                    border-bottom: 1px solid #e9ecef;
                }
                .expenses-table td:last-child {
                    text-align: right;
                    font-weight: 500;
                }
                .total-section {
                    margin-top: 40px;
                    border-top: 2px solid #dee2e6;
                    padding-top: 20px;
                }
                .summary-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                .summary-table tr:last-child {
                    font-size: 18px;
                    font-weight: bold;
                    border-top: 1px solid #dee2e6;
                }
                .summary-table td {
                    padding: 8px 5px;
                }
                .summary-table td:first-child {
                    width: 70%;
                    text-align: right;
                }
                .summary-table td:last-child {
                    width: 30%;
                    text-align: right;
                }
                .expense-amount {
                    color: #dc3545;
                }
                .sale-amount {
                    color: #28a745;
                }
                .page-footer {
                    margin-top: 50px;
                    text-align: center;
                    font-size: 12px;
                    color: #6c757d;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="logo">Huevos La Rural</div>
                <div class="sale-info">
                    <div class="sale-name">${sale.name}</div>
                    <div>Fecha: ${creationDate}</div>
                    <div>Hora: ${creationTime}</div>
                </div>
            </div>
            
            <div class="section-header">Registro de Ventas</div>
        `;

        // Información de transacciones
        sortedTransactions.forEach(transaction => {
            const transactionDate = formatDate(transaction.timestamp);
            const transactionTime = formatTime(transaction.timestamp);

            let transactionType = '';
            if (transaction.type === 'carton') {
                transactionType = 'Cartones';
            } else if (transaction.type === 'half_carton') {
                transactionType = 'Medios Cartones';
            } else {
                transactionType = 'Cajas';
            }

            htmlContent += `
            <div class="transaction-item">
                <div class="transaction-header">
                    <div class="transaction-title">${transactionType}</div>
                    <div class="transaction-date">${transactionDate} - ${transactionTime}</div>
                </div>
                
                <table class="details-table">
                    <tr>
                        <td>Cantidad:</td>
                        <td>${transaction.quantity}</td>
                    </tr>
                    <tr>
                        <td>Precio unitario:</td>
                        <td>$${transaction.unitPrice.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td>Total venta:</td>
                        <td class="sale-amount">$${transaction.total.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td>Recibido:</td>
                        <td>$${transaction.totalReceived.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td>Cambio:</td>
                        <td>$${transaction.change.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td>Ubicación:</td>
                        <td>${transaction.location || 'No especificada'}</td>
                    </tr>
                </table>
                
                <div class="bills-details">
                    <div class="bills-header">Billetes recibidos:</div>
                    <div class="bills-grid">
            `;

            // Billetes recibidos
            Object.entries(transaction.receivedMoney).forEach(([bill, count]) => {
                if (count > 0) {
                    htmlContent += `
                    <div class="bill-item">
                        $${bill} x ${count}
                    </div>
                    `;
                }
            });

            htmlContent += `
                    </div>
                </div>
            </div>
            `;
        });

        // Si hay gastos, los agregamos
        if (sale.expenses && sale.expenses.length > 0) {
            const totalExpenses = sale.expenses.reduce((sum, expense) => sum + expense.amount, 0);

            htmlContent += `
            <div class="section-header">Registro de Gastos</div>
            
            <table class="expenses-table">
                <thead>
                    <tr>
                        <th>Descripción</th>
                        <th>Fecha y Hora</th>
                        <th>Monto</th>
                    </tr>
                </thead>
                <tbody>
            `;

            sale.expenses.forEach(expense => {
                const expenseDate = formatDate(expense.timestamp);
                const expenseTime = formatTime(expense.timestamp);

                htmlContent += `
                <tr>
                    <td>${expense.description}</td>
                    <td>${expenseDate} - ${expenseTime}</td>
                    <td class="expense-amount">$${expense.amount.toFixed(2)}</td>
                </tr>
                `;
            });

            htmlContent += `
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="2" style="text-align: right; font-weight: bold;">Total Gastos:</td>
                        <td class="expense-amount">$${totalExpenses.toFixed(2)}</td>
                    </tr>
                </tfoot>
            </table>
            `;
        }

        // Sección de totales
        const totalExpenses = sale.expenses ? sale.expenses.reduce((sum, expense) => sum + expense.amount, 0) : 0;
        const netTotal = totalSales - totalExpenses;

        htmlContent += `
            <div class="total-section">
                <table class="summary-table">
                    <tr>
                        <td>Total Ventas:</td>
                        <td class="sale-amount">$${totalSales.toFixed(2)}</td>
                    </tr>
                    ${sale.expenses && sale.expenses.length > 0 ?
                `<tr>
                        <td>Total Gastos:</td>
                        <td class="expense-amount">$${totalExpenses.toFixed(2)}</td>
                    </tr>` : ''}
                    <tr>
                        <td>Balance Neto:</td>
                        <td>${netTotal >= 0 ?
                `<span class="sale-amount">$${netTotal.toFixed(2)}</span>` :
                `<span class="expense-amount">$${netTotal.toFixed(2)}</span>`}</td>
                    </tr>
                </table>
            </div>
            
            <div class="page-footer">
                Este documento es un registro oficial de Huevos La Rural - Generado el ${formatDate(new Date())}
            </div>
        </body>
        </html>
        `;

        return htmlContent;
    };

    // Función para guardar el PDF en el dispositivo
    const savePDF = async () => {
        try {
            const pdfContent = generatePDFContent();

            // Generar el PDF
            const { uri } = await Print.printToFileAsync({ html: pdfContent });

            // Formatear la fecha para el nombre del archivo
            const date = new Date();
            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const year = date.getFullYear().toString();

            // Formatear la hora para el nombre del archivo
            let hours = date.getHours();
            const minutes = date.getMinutes().toString().padStart(2, '0');
            const seconds = date.getSeconds().toString().padStart(2, '0');
            const ampm = hours >= 12 ? 'PM' : 'AM';

            hours = hours % 12;
            hours = hours ? hours : 12; // la hora '0' debe ser '12'
            const formattedHours = hours.toString().padStart(2, '0');

            const timeString = `${formattedHours}:${minutes}:${seconds} ${ampm}`;

            // Directorio destino
            const destinationDir = FileSystem.documentDirectory + 'Huevos La Rural/';

            // Crear directorio si no existe
            try {
                const dirInfo = await FileSystem.getInfoAsync(destinationDir);
                if (!dirInfo.exists) {
                    await FileSystem.makeDirectoryAsync(destinationDir, { intermediates: true });
                }
            } catch (error) {
                console.error('Error al crear directorio:', error);
            }

            // Nombre del archivo con la hora incluida
            const fileName = `${day}_${month}_${year} ${timeString} - Registro de venta.pdf`;
            const filePath = destinationDir + fileName;

            // Mover el archivo
            await FileSystem.moveAsync({
                from: uri,
                to: filePath
            });

            // Compartir el archivo
            await Sharing.shareAsync(filePath);

            Alert.alert(
                "PDF Guardado",
                `El PDF ha sido guardado como "${fileName}" y compartido.`,
                [{ text: "OK" }]
            );
        } catch (error) {
            console.error('Error al generar o guardar PDF:', error);
            Alert.alert(
                "Error",
                "Ocurrió un error al guardar el PDF. Intente nuevamente.",
                [{ text: "OK" }]
            );
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.menuContainer}>
                <TouchableOpacity
                    style={styles.menuButton}
                    onPress={() => setMenuOpen(!menuOpen)}>
                    <Text style={styles.menuButtonText}>
                        {menuOpen ? "Cerrar menú" : "Abrir menú"}
                    </Text>
                </TouchableOpacity>

                {menuOpen && (
                    <View style={styles.submenuContainer}>
                        <TouchableOpacity style={styles.pdfButton} onPress={savePDF}>
                            <Text style={styles.pdfButtonText}>Guardar registro PDF</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <ScrollView style={styles.transactionsList}>
                {sortedTransactions.map((transaction) => (
                    <View key={transaction.id} style={styles.transactionItem}>
                        <View style={styles.transactionHeader}>
                            <Text style={styles.transactionType}>
                                {transaction.type === 'carton' ? 'Cartones' : transaction.type === 'half_carton' ? 'Medios Cartones' : 'Cajas'}
                            </Text>
                            <Text style={styles.transactionDate}>
                                {formatDate(transaction.timestamp)} {formatTime(transaction.timestamp)}
                            </Text>
                        </View>

                        <View style={styles.transactionDetails}>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Cantidad:</Text>
                                <Text style={styles.detailValue}>{transaction.quantity}</Text>
                            </View>

                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Precio unitario:</Text>
                                <Text style={styles.detailValue}>${transaction.unitPrice.toFixed(2)}</Text>
                            </View>

                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Total venta:</Text>
                                <Text style={styles.detailValue}>${transaction.total.toFixed(2)}</Text>
                            </View>

                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Recibido:</Text>
                                <Text style={styles.detailValue}>${transaction.totalReceived.toFixed(2)}</Text>
                            </View>

                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Cambio:</Text>
                                <Text style={[styles.detailValue, styles.changeValue]}>
                                    ${transaction.change.toFixed(2)}
                                </Text>
                            </View>

                            {/* Añadir la ubicación de la venta */}
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Ubicación:</Text>
                                <Text style={[styles.detailValue, styles.locationValue]}>
                                    {transaction.location || 'No especificada'}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.billsDetails}>
                            <Text style={styles.billsTitle}>Billetes recibidos:</Text>
                            <View style={styles.billsList}>
                                {Object.entries(transaction.receivedMoney).map(([bill, count]) => (
                                    count > 0 && (
                                        <View key={bill} style={styles.billItem}>
                                            <Text style={styles.billValue}>${bill}</Text>
                                            <Text style={styles.billCount}>x{count}</Text>
                                        </View>
                                    )
                                ))}
                            </View>
                        </View>
                    </View>
                ))}
            </ScrollView>

            <View style={styles.totalContainer}>
                <Text style={styles.totalLabel}>Total Ventas:</Text>
                <Text style={styles.totalValue}>${totalSales.toFixed(2)}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        color: COLORS.textSecondary,
        fontSize: 16,
    },
    transactionsList: {
        flex: 1,
    },
    transactionItem: {
        backgroundColor: COLORS.card,
        borderRadius: 8,
        padding: 15,
        marginBottom: 10,
    },
    transactionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    transactionType: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: 'bold',
    },
    transactionDate: {
        color: COLORS.textSecondary,
        fontSize: 12,
    },
    transactionDetails: {
        marginBottom: 10,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 5,
    },
    detailLabel: {
        color: COLORS.textSecondary,
        fontSize: 14,
    },
    detailValue: {
        color: COLORS.text,
        fontSize: 14,
        fontWeight: '500',
    },
    changeValue: {
        color: COLORS.success,
    },
    billsDetails: {
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingTop: 10,
    },
    billsTitle: {
        color: COLORS.text,
        fontSize: 14,
        marginBottom: 5,
    },
    billsList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    billItem: {
        flexDirection: 'row',
        backgroundColor: COLORS.background,
        borderRadius: 4,
        paddingVertical: 4,
        paddingHorizontal: 8,
        marginRight: 8,
        marginBottom: 5,
        alignItems: 'center',
    },
    billValue: {
        color: COLORS.accent,
        fontSize: 14,
        fontWeight: '500',
    },
    billCount: {
        color: COLORS.text,
        fontSize: 12,
        marginLeft: 5,
    },
    totalContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: COLORS.primary,
        padding: 15,
        borderRadius: 5,
        marginTop: 10,
    },
    totalLabel: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: 'bold',
    },
    totalValue: {
        color: COLORS.secondary,
        fontSize: 16,
        fontWeight: 'bold',
    },
    locationValue: {
        color: COLORS.accent,
        fontWeight: 'bold',
    },
    pdfButton: {
        backgroundColor: COLORS.accent,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 15,
        marginHorizontal: 10,
    },
    pdfButtonText: {
        color: COLORS.text,
        fontWeight: 'bold',
        fontSize: 16,
    },
    menuContainer: {
        marginBottom: 10,
        marginHorizontal: 10,
    },
    menuButton: {
        backgroundColor: COLORS.primary,
        padding: 8,
        borderRadius: 6,
        alignItems: 'center',
    },
    menuButtonText: {
        color: COLORS.text,
        fontWeight: 'bold',
        fontSize: 14,
    },
    submenuContainer: {
        marginTop: 8,
    },
});

export default TransactionsList;