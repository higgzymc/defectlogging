// Source: https://bustimes.org/operators/transdev-burnley/vehicles
// Checked: 2026-05-03. Bustimes notes this is tracking/ticket-machine data, not a guaranteed complete fleet list.
window.STANDARD_FLEET_VEHICLES = [
    { number: '64', type: 'Mercedes-Benz Sprinter Mellor Strata' },
    { number: '65', type: 'Mercedes-Benz Sprinter Mellor Strata' },
    { number: '154', type: 'Optare Solo SR' },
    { number: '155', type: 'Optare Solo SR' },
    { number: '156', type: 'Optare Solo SR' },
    { number: '157', type: 'Optare Solo SR' },
    { number: '158', type: 'Optare Solo SR' },
    { number: '159', type: 'Optare Solo SR' },
    { number: '160', type: 'Optare Solo SR' },
    { number: '244', type: 'Optare Versa' },
    { number: '245', type: 'Optare Versa' },
    { number: '246', type: 'Optare Versa' },
    { number: '247', type: 'Optare Versa' },
    { number: '248', type: 'Optare Versa' },
    { number: '249', type: 'Optare Versa' },
    { number: '250', type: 'Optare Versa' },
    { number: '251', type: 'Optare Versa' },
    { number: '252', type: 'Optare Versa' },
    { number: '254', type: 'Optare Versa' },
    { number: '255', type: 'Optare Versa' },
    { number: '256', type: 'Optare Versa' },
    { number: '257', type: 'Optare Versa' },
    { number: '258', type: 'Optare Versa' },
    { number: '259', type: 'Optare Versa' },
    { number: '260', type: 'Optare Versa' },
    { number: '261', type: 'Optare Versa' },
    { number: '262', type: 'Optare Versa' },
    { number: '263', type: 'Optare Versa' },
    { number: '264', type: 'Optare Versa' },
    { number: '265', type: 'Optare Versa' },
    { number: '266', type: 'Optare Versa' },
    { number: '267', type: 'Optare Versa' },
    { number: '268', type: 'Optare Versa' },
    { number: '269', type: 'Optare Versa' },
    { number: '270', type: 'Optare Versa' },
    { number: '271', type: 'Optare Versa' },
    { number: '272', type: 'Optare Versa' },
    { number: '273', type: 'Optare Versa' },
    { number: '763', type: 'ADL Enviro200' },
    { number: '764', type: 'ADL Enviro200' },
    { number: '765', type: 'ADL Enviro200' },
    { number: '766', type: 'ADL Enviro200' },
    { number: '767', type: 'ADL Enviro200' },
    { number: '768', type: 'ADL Enviro200' },
    { number: '769', type: 'ADL Enviro200' },
    { number: '770', type: 'ADL Enviro200' },
    { number: '1727', type: 'Volvo B7RLE Wright Eclipse Urban' },
    { number: '1734', type: 'Volvo B7RLE Wright Eclipse Urban' },
    { number: '1761', type: 'Volvo B7RLE Plaxton Centro' },
    { number: '1762', type: 'Volvo B7RLE Plaxton Centro' },
    { number: '1763', type: 'Volvo B7RLE Plaxton Centro' },
    { number: '1764', type: 'Volvo B7RLE Plaxton Centro' },
    { number: '1765', type: 'Volvo B7RLE Plaxton Centro' },
    { number: '1766', type: 'Volvo B7RLE Plaxton Centro' },
    { number: '2001', type: 'ADL Enviro400 MMC' },
    { number: '2002', type: 'ADL Enviro400 MMC' },
    { number: '2003', type: 'ADL Enviro400 MMC' },
    { number: '2004', type: 'ADL Enviro400 MMC' },
    { number: '2005', type: 'ADL Enviro400 MMC' },
    { number: '2006', type: 'ADL Enviro400 MMC' },
    { number: '2007', type: 'ADL Enviro400 MMC' },
    { number: '2008', type: 'ADL Enviro400 MMC' },
    { number: '2009', type: 'ADL Enviro400 MMC' },
    { number: '2010', type: 'ADL Enviro400 MMC' },
    { number: '2011', type: 'ADL Enviro400 MMC' },
    { number: '2012', type: 'ADL Enviro400 MMC' },
    { number: '2013', type: 'ADL Enviro400 MMC' },
    { number: '2014', type: 'ADL Enviro400 MMC' },
    { number: '2015', type: 'ADL Enviro400 MMC' },
    { number: '2016', type: 'ADL Enviro400 MMC' },
    { number: '2017', type: 'ADL Enviro400 MMC' },
    { number: '2018', type: 'ADL Enviro400 MMC' },
    { number: '2019', type: 'ADL Enviro400 MMC' },
    { number: '2428', type: 'Volvo B9TL Wright Eclipse Gemini 2' },
    { number: '2451', type: 'Volvo B9TL Wright Eclipse Gemini' },
    { number: '2452', type: 'Volvo B9TL Wright Eclipse Gemini' },
    { number: '2777', type: 'Volvo B9TL Wright Eclipse Gemini 2' },
    { number: '2778', type: 'Volvo B9TL Wright Eclipse Gemini 2' },
    { number: '2811', type: 'ADL Enviro400' },
    { number: '2812', type: 'ADL Enviro400' },
    { number: '2813', type: 'ADL Enviro400' },
    { number: '2814', type: 'ADL Enviro400' },
    { number: '2815', type: 'ADL Enviro400' },
    { number: '2816', type: 'ADL Enviro400' }
];

window.FLEET_VEHICLES = [...window.STANDARD_FLEET_VEHICLES];
const CUSTOM_FLEET_STORAGE_KEY = 'customFleetVehicles';

function normaliseFleetNumber(value) {
    return String(value || '').trim();
}

function upsertFleetVehicle(vehicle) {
    const number = normaliseFleetNumber(vehicle.number);
    const type = String(vehicle.type || '').trim();
    if (!number || !type) return;

    const existingIndex = window.FLEET_VEHICLES.findIndex(item => item.number === number);
    const savedVehicle = { number, type };
    if (existingIndex >= 0) {
        window.FLEET_VEHICLES[existingIndex] = savedVehicle;
    } else {
        window.FLEET_VEHICLES.push(savedVehicle);
    }
    window.FLEET_VEHICLES.sort((a, b) => (parseInt(a.number, 10) || 0) - (parseInt(b.number, 10) || 0));
}

function getFleetVehicle(fleetNumber) {
    const number = normaliseFleetNumber(fleetNumber);
    return window.FLEET_VEHICLES.find(vehicle => vehicle.number === number) || null;
}

function getVehicleTypeForFleetNumber(fleetNumber) {
    return getFleetVehicle(fleetNumber)?.type || '';
}

function isValidFleetNumber(fleetNumber) {
    return Boolean(getFleetVehicle(fleetNumber));
}

function getLocalCustomFleetVehicles() {
    try {
        return JSON.parse(localStorage.getItem(CUSTOM_FLEET_STORAGE_KEY) || '[]');
    } catch (error) {
        console.error('Error reading local fleet vehicles:', error);
        return [];
    }
}

function saveLocalCustomFleetVehicle(vehicle) {
    const vehicles = getLocalCustomFleetVehicles();
    const existingIndex = vehicles.findIndex(item => item.number === vehicle.number);
    if (existingIndex >= 0) {
        vehicles[existingIndex] = vehicle;
    } else {
        vehicles.push(vehicle);
    }
    localStorage.setItem(CUSTOM_FLEET_STORAGE_KEY, JSON.stringify(vehicles));
}

async function loadCustomFleetVehicles() {
    getLocalCustomFleetVehicles().forEach(vehicle => upsertFleetVehicle(vehicle));

    try {
        const snapshot = await db.collection('fleetVehicles').get();
        snapshot.docs.forEach(doc => upsertFleetVehicle(doc.data()));
    } catch (error) {
        console.error('Error loading custom fleet vehicles:', error);
    }
}

async function saveCustomFleetVehicle(vehicle) {
    const number = normaliseFleetNumber(vehicle.number);
    const type = String(vehicle.type || '').trim();
    if (!number || !type) {
        throw new Error('Fleet number and vehicle type are required.');
    }

    const savedVehicle = {
        number,
        type,
        updatedAt: new Date().toISOString()
    };

    saveLocalCustomFleetVehicle(savedVehicle);
    upsertFleetVehicle(savedVehicle);

    try {
        await db.collection('fleetVehicles').doc(number).set(savedVehicle, { merge: true });
        return { vehicle: savedVehicle, savedToCloud: true };
    } catch (error) {
        console.error('Error saving custom fleet vehicle to Firestore:', error);
        return { vehicle: savedVehicle, savedToCloud: false };
    }
}
