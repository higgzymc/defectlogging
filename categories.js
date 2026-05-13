document.addEventListener('DOMContentLoaded', () => {
    const newCategoryName = document.getElementById('newCategoryName');
    const newCategorySubcategories = document.getElementById('newCategorySubcategories');
    const saveCategoryBtn = document.getElementById('saveCategoryBtn');
    const saveCategoryStatus = document.getElementById('saveCategoryStatus');
    const existingCategorySelect = document.getElementById('existingCategorySelect');
    const newSubcategoryName = document.getElementById('newSubcategoryName');
    const saveSubcategoryBtn = document.getElementById('saveSubcategoryBtn');
    const saveSubcategoryStatus = document.getElementById('saveSubcategoryStatus');
    const categoriesList = document.getElementById('categoriesList');

    function setStatus(element, message, type = '') {
        element.textContent = message;
        element.className = type ? `form-status ${type}` : 'form-status';
    }

    function renderCategorySelect() {
        const areas = getDefectCategoryAreas();
        existingCategorySelect.innerHTML = '';
        areas.forEach((area) => {
            const option = document.createElement('option');
            option.value = area;
            option.textContent = area;
            existingCategorySelect.appendChild(option);
        });
    }

    function renderCategoriesList() {
        const areas = getDefectCategoryAreas();
        categoriesList.innerHTML = '';

        if (areas.length === 0) {
            categoriesList.innerHTML = '<p>No categories available yet.</p>';
            return;
        }

        areas.forEach((area) => {
            const subcategories = getSubcategoriesForArea(area);
            const section = document.createElement('section');
            section.className = 'category-card';
            section.innerHTML = `
                <div class="category-card-header">
                    <h4>${area}</h4>
                    <span>${subcategories.length} subcategories</span>
                </div>
                <div class="category-chip-list">
                    ${subcategories.map((subcategory) => `<span class="category-chip">${subcategory}</span>`).join('')}
                </div>
            `;
            categoriesList.appendChild(section);
        });
    }

    async function refreshCategories() {
        await loadDefectCategories();
        renderCategorySelect();
        renderCategoriesList();
    }

    saveCategoryBtn.addEventListener('click', async () => {
        const area = newCategoryName.value.trim();
        const subcategories = newCategorySubcategories.value
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean);

        if (!area) {
            setStatus(saveCategoryStatus, 'Enter a category name first.', 'error');
            return;
        }

        saveCategoryBtn.disabled = true;
        setStatus(saveCategoryStatus, 'Saving category...');

        try {
            await saveDefectCategory(area, subcategories);
            newCategoryName.value = '';
            newCategorySubcategories.value = '';
            setStatus(saveCategoryStatus, `Saved ${area}.`, 'success');
            await refreshCategories();
        } catch (error) {
            console.error('Error saving category:', error);
            setStatus(saveCategoryStatus, 'Could not save category. Please try again.', 'error');
        } finally {
            saveCategoryBtn.disabled = false;
        }
    });

    saveSubcategoryBtn.addEventListener('click', async () => {
        const area = existingCategorySelect.value;
        const subcategory = newSubcategoryName.value.trim();

        if (!area || !subcategory) {
            setStatus(saveSubcategoryStatus, 'Choose a category and enter a subcategory.', 'error');
            return;
        }

        saveSubcategoryBtn.disabled = true;
        setStatus(saveSubcategoryStatus, 'Adding subcategory...');

        try {
            await addDefectSubcategory(area, subcategory);
            newSubcategoryName.value = '';
            setStatus(saveSubcategoryStatus, `${subcategory} added to ${area}.`, 'success');
            await refreshCategories();
        } catch (error) {
            console.error('Error adding subcategory:', error);
            setStatus(saveSubcategoryStatus, 'Could not add subcategory. Please try again.', 'error');
        } finally {
            saveSubcategoryBtn.disabled = false;
        }
    });

    auth.onAuthStateChanged(async (user) => {
        if (!user) return;
        await refreshCategories();
    });
});
