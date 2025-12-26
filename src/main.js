/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    // purchase — это одна из записей в поле items из чека в data.purchase_records
    // _product — это продукт из коллекции data.products
    const { discount, sale_price, quantity } = purchase;
    // @TODO: Расчёт прибыли от операции
    const discountFactor = 1 - (discount / 100);
    return sale_price * quantity * discountFactor;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    const { profit } = seller;
    // @TODO: Расчет бонуса от позиции в рейтинге
    if (index === total - 1) {
        return 0;
    } else if (index === 0) {
        return profit * 0.15;
    } else if (index === 1 || index === 2) {
        return profit * 0.10;
    } else {
        return profit * 0.05;
    }
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    // @TODO: Проверка входных данных
    if (
        !data
        || typeof data !== "object"
        || !Array.isArray(data.sellers)
        || !Array.isArray(data.products)
        || !Array.isArray(data.purchase_records)
        || data.sellers.length === 0
        || data.products.length === 0
        || data.purchase_records.length === 0
    ) {
        throw new Error("Некорректные входные данные");
    }

    // @TODO: Проверка наличия опций
    if (!options || typeof options !== "object") {
        throw new Error("Опции не переданы");
    }

    const { calculateRevenue, calculateBonus } = options;

    if (
        typeof calculateRevenue !== "function"
        || typeof calculateBonus !== "function"
    ) {
        throw new Error("Функции расчёта не переданы");
    }

    // @TODO: Подготовка промежуточных данных для сбора статистики
    const sellerStats = data.sellers.map(seller => ({
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {}
    }));

    // @TODO: Индексация продавцов и товаров для быстрого доступа
    const sellerIndex = Object.fromEntries(
        sellerStats.map(stat => [stat.id, stat])
    );

    const productIndex = Object.fromEntries(
        data.products.map(product => [product.sku, product])
    );

    // @TODO: Расчёт выручки и прибыли для каждого продавца
    data.purchase_records.forEach(record => {
        const seller = sellerIndex[record.seller_id];
        if (!seller) return;

        // Количество продаж (количество чеков)
        seller.sales_count += 1;

        // Выручка продавца — выручка чека с учётом скидки 
        seller.revenue += (record.total_amount - record.total_discount);

        // Прибыль и товары считаем по позициям чека
        record.items.forEach(item => {
            const product = productIndex[item.sku];
            if (!product) return;

            // Себестоимость товара
            const cost = product.purchase_price * item.quantity;

            // Выручка по позиции 
            const revenueItem = calculateRevenue(item, product);

            // Прибыль по позиции
            const profitItem = revenueItem - cost;

            // Накопление прибыли продавца
            seller.profit += profitItem;

            // Учёт количества проданных товаров (в штуках)
            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            seller.products_sold[item.sku] += item.quantity;
        });
    });

    // @TODO: Сортировка продавцов по прибыли
    // Продавец с наибольшей прибылью должен оказаться первым (индекс 0)
    sellerStats.sort((a, b) => {
        return b.profit - a.profit;
    });

    // @TODO: Назначение премий на основе ранжирования
    sellerStats.forEach((seller, index) => {
        seller.bonus = calculateBonus(index, sellerStats.length, seller);

        // @TODO: Формирование топ-10 товаров продавца
        seller.top_products = Object.entries(seller.products_sold)

            .map(([sku, quantity]) => ({
                sku,
                quantity
            }))

            .sort((a, b) => b.quantity - a.quantity)

            .slice(0, 10);
    });

    // @TODO: Подготовка итоговой коллекции с нужными полями
    return sellerStats.map(seller => ({
        seller_id: seller.id,
        name: seller.name,
        // Общая выручка продавца с учётом скидок
        revenue: +seller.revenue.toFixed(2),
        // Общая прибыль продавца
        profit: +seller.profit.toFixed(2),
        // Количество продаж (чеков)
        sales_count: seller.sales_count,
        // Топ-10 проданных товаров продавца
        top_products: seller.top_products,
        // Итоговый бонус продавца в рублях
        bonus: +seller.bonus.toFixed(2)
    }));
}


