# Related Products Module

A comprehensive module for managing product recommendations and related product suggestions in the Comrades360 e-commerce platform.

## Features

- **Pre-calculated Storage**: Related products are calculated and stored in the database for instant loading
- **Smart Algorithm**: Multi-factor categorization considering category, subcategory, price, and brand
- **Automated Maintenance**: Background processing keeps recommendations fresh
- **Performance Optimized**: Batch processing and caching for large product catalogs
- **Real-time Updates**: Automatic recalculation when products change significantly

## Architecture

### Core Components

1. **RelatedProductsModule Class**: Main module class with all functionality
2. **Database Fields**: `relatedProducts` (JSON) and `relatedProductsLastUpdated` (Date)
3. **Integration Points**: Product creation, updates, and API responses

### Algorithm Factors (Weighted)

- **Same Category (60%)**: Products in the same category, prioritized by sales/view count
- **Same Subcategory (20%)**: Additional products from same subcategory
- **Price Range (10%)**: Products within ±30% price range
- **Same Brand (10%)**: Products from the same brand

## Usage

### Basic Usage

```javascript
const relatedProductsModule = require('./modules/relatedProducts');

// Calculate related products for a specific product
await relatedProductsModule.calculateRelatedProducts(productId);

// Get related products data for API response
const relatedProducts = await relatedProductsModule.getRelatedProductsData(productIds);

// Check if recalculation is needed
if (relatedProductsModule.needsRecalculation(product)) {
  relatedProductsModule.triggerCalculation(product.id);
}
```

### Maintenance

```javascript
// Run maintenance to update all stale related products
const results = await relatedProductsModule.performMaintenance();
console.log(`Processed ${results.totalProcessed} products`);
```

### CLI Scripts

```bash
# Calculate related products for all products
cd backend && node -e "require('./modules/relatedProducts').calculateRelatedProducts()"

# Run maintenance
cd backend && node -e "require('./modules/relatedProducts').performMaintenance()"
```

## Configuration

The module can be configured by modifying the constructor parameters:

```javascript
const relatedProductsModule = new RelatedProductsModule({
  maxRelatedProducts: 6,      // Maximum related products per product
  priceRangeTolerance: 0.3,   // ±30% price range
  updateThresholdDays: 7,     // Days before recalculation needed
  batchSize: 50              // Products to process per batch
});
```

## Database Schema

### Product Model Additions

```javascript
{
  relatedProducts: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  relatedProductsLastUpdated: {
    type: DataTypes.DATE,
    allowNull: true
  }
}
```

## API Integration

The module automatically integrates with the product controller:

- **Product Creation**: Related products calculated for new approved products
- **Product Updates**: Recalculation triggered for significant changes
- **Product Retrieval**: Related products included in API responses

## Performance Considerations

- **Batch Processing**: Large catalogs processed in configurable batches
- **Background Processing**: Calculations run asynchronously to avoid blocking
- **Caching**: Results cached until next maintenance cycle
- **Indexing**: Ensure proper database indexes on categoryId, brand, basePrice

## Monitoring

The module provides comprehensive logging:

- Processing progress and results
- Error tracking and reporting
- Performance metrics (processing time, success rates)
- Maintenance scheduling information

## Future Enhancements

- **Machine Learning**: User behavior-based recommendations
- **A/B Testing**: Different algorithms for different user segments
- **Real-time Updates**: WebSocket notifications for new recommendations
- **Analytics**: Track recommendation click-through rates