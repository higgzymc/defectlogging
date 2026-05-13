window.DEFAULT_DEFECT_CATEGORIES = {
    Front: ['Destination Display', 'Headlights', 'Indicators', 'Wipers', 'Windscreen', 'Bodywork'],
    Nearside: ['Bodywork', 'Windows', 'Lights', 'Tyre', 'Wheel', 'Doors'],
    Rear: ['Rear Lights', 'Engine Flap', 'Bodywork', 'Destination Display', 'Bumper'],
    Offside: ['Bodywork', 'Windows', 'Tyre', 'Wheel', 'Lights'],
    Cab: ['Steering', 'Dashboard', 'Ticket Machine Area', 'Mirrors', 'Driver Seat', 'Warning Lights'],
    Saloon: ['Seats', 'Bell Pushes', 'Lighting', 'Heating', 'Flooring', 'Windows'],
    Engine: ['Oil Leak', 'Coolant Leak', 'Belts', 'Batteries', 'Overheating', 'Loss of Power']
};

window.defectCategoriesMap = cloneDefaultDefectCategories();

function cloneDefaultDefectCategories() {
    return Object.fromEntries(
        Object.entries(window.DEFAULT_DEFECT_CATEGORIES).map(([area, subcategories]) => [area, [...subcategories]])
    );
}

function getDefectCategoryAreas() {
    const defaultAreas = Object.keys(window.DEFAULT_DEFECT_CATEGORIES);
    const currentAreas = Object.keys(window.defectCategoriesMap || {});
    return [...new Set([...defaultAreas, ...currentAreas])];
}

function getSubcategoriesForArea(area) {
    if (!area) return [];
    return [...(window.defectCategoriesMap[area] || [])];
}

function mergeCategoryData(area, subcategories) {
    const areaName = String(area || '').trim();
    if (!areaName) return;

    const defaultValues = window.DEFAULT_DEFECT_CATEGORIES[areaName] || [];
    const incomingValues = Array.isArray(subcategories)
        ? subcategories.map(value => String(value || '').trim()).filter(Boolean)
        : [];

    window.defectCategoriesMap[areaName] = [...new Set([...defaultValues, ...incomingValues])];
}

async function loadDefectCategories() {
    window.defectCategoriesMap = cloneDefaultDefectCategories();

    try {
        const snapshot = await db.collection('defectCategories').get();
        snapshot.docs.forEach(doc => {
            const data = doc.data() || {};
            const area = data.area || doc.id;
            mergeCategoryData(area, data.subcategories);
        });
    } catch (error) {
        console.error('Error loading defect categories:', error);
    }

    return window.defectCategoriesMap;
}

async function saveDefectCategory(area, subcategories) {
    const areaName = String(area || '').trim();
    const cleanedSubcategories = [...new Set(
        (Array.isArray(subcategories) ? subcategories : [])
            .map(value => String(value || '').trim())
            .filter(Boolean)
    )];

    if (!areaName) {
        throw new Error('Category name is required.');
    }

    const existingValues = getSubcategoriesForArea(areaName);
    const mergedSubcategories = [...new Set([...existingValues, ...cleanedSubcategories])];

    const payload = {
        area: areaName,
        subcategories: mergedSubcategories,
        updatedAt: new Date().toISOString()
    };

    await db.collection('defectCategories').doc(areaName).set(payload, { merge: true });
    mergeCategoryData(areaName, mergedSubcategories);
    return payload;
}

async function addDefectSubcategory(area, subcategory) {
    const areaName = String(area || '').trim();
    const subcategoryName = String(subcategory || '').trim();

    if (!areaName || !subcategoryName) {
        throw new Error('Category and subcategory are required.');
    }

    return saveDefectCategory(areaName, [subcategoryName]);
}
