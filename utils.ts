// --- UTILITY FUNCTIONS ---
export const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);
};

export const generateId = () => `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
});

// --- IMAGE CACHING ---
export const IMAGE_CACHE_NAME = 'prorab-image-cache-v1';

export const cacheImage = async (file: File): Promise<string> => {
    const cache = await caches.open(IMAGE_CACHE_NAME);
    // Create a unique URL for the image
    const url = `/cached-images/${generateId()}/${encodeURIComponent(file.name)}`;
    // Create a Response object from the file blob
    const response = new Response(file, {
        headers: {
            'Content-Type': file.type,
            'Content-Length': String(file.size),
        },
    });
    // Add the response to the cache
    await cache.put(url, response);
    return url;
};

export const deleteCachedImage = async (url: string): Promise<boolean> => {
    try {
        const cache = await caches.open(IMAGE_CACHE_NAME);
        return await cache.delete(url);
    } catch (error) {
        console.error("Error deleting cached image:", error);
        return false;
    }
};