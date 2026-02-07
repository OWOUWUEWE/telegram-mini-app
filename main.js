// Событие при изменении localStorage (между вкладками)
window.addEventListener('storage', (e) => {
    if (e.key === 'messenger_data') {
        loadData(); // Загружаем обновленные данные
        updateUI(); // Обновляем интерфейс
    }
});

// Синхронизация каждую секунду
setInterval(() => {
    loadData();
    updateUI();
}, 1000);