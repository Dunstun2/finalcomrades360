/**
 * Query Performance Logger
 * Logs slow queries and provides performance insights
 */

const SLOW_QUERY_THRESHOLD_MS = 100; // Log queries slower than 100ms

class QueryLogger {
  constructor() {
    this.queries = [];
    this.slowQueries = [];
  }

  logQuery(sql, duration) {
    if (duration >= SLOW_QUERY_THRESHOLD_MS) {
      this.slowQueries.push({ sql, duration, timestamp: new Date() });
      
      // Keep only last 100 slow queries
      if (this.slowQueries.length > 100) {
        this.slowQueries.shift();
      }

      console.warn(`⚠️  SLOW QUERY (${duration}ms):\n${sql}\n`);
    }
  }

  getSlowQueries() {
    return this.slowQueries.sort((a, b) => b.duration - a.duration);
  }

  printSummary() {
    if (this.slowQueries.length === 0) {
      console.log('✅ No slow queries detected');
      return;
    }

    const avgDuration = this.slowQueries.reduce((sum, q) => sum + q.duration, 0) / this.slowQueries.length;
    const maxDuration = Math.max(...this.slowQueries.map(q => q.duration));
    
    console.log('\n📊 Slow Query Summary:');
    console.log(`   Total slow queries: ${this.slowQueries.length}`);
    console.log(`   Average duration: ${avgDuration.toFixed(2)}ms`);
    console.log(`   Max duration: ${maxDuration}ms`);
    console.log(`   Threshold: ${SLOW_QUERY_THRESHOLD_MS}ms\n`);
    
    // Top 10 slowest
    console.log('Top 10 Slowest Queries:');
    this.getSlowQueries().slice(0, 10).forEach((q, i) => {
      console.log(`${i + 1}. ${q.duration}ms - ${q.sql.substring(0, 80)}...`);
    });
  }

  reset() {
    this.queries = [];
    this.slowQueries = [];
  }
}

module.exports = new QueryLogger();
