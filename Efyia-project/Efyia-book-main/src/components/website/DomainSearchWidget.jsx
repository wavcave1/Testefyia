import { useState } from 'react';
import { websiteApi } from '../../lib/api';

export default function DomainSearchWidget({ websiteId, onPurchased }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setSearchError(null);
    setResults(null);
    try {
      const data = await websiteApi.searchDomain(query.trim());
      setResults(data);
    } catch (err) {
      setSearchError(err.message || 'Domain search failed.');
    } finally {
      setSearching(false);
    }
  };

  const handlePurchase = async (domain) => {
    setPurchasing(true);
    setPurchaseError(null);
    try {
      await websiteApi.purchaseDomain(websiteId, domain);
      if (onPurchased) onPurchased(domain);
    } catch (err) {
      setPurchaseError(err.message || 'Purchase failed. Please try again.');
      setPurchasing(false);
    }
  };

  return (
    <div className="wb-domain-widget">
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="yourstudio.com"
          style={{ flex: 1 }}
        />
        <button type="submit" className="eyf-button" disabled={searching}>
          {searching ? 'Searching...' : 'Search'}
        </button>
      </form>

      {searchError ? (
        <p style={{ color: 'var(--error, #f87171)', fontSize: '0.875rem' }}>{searchError}</p>
      ) : null}

      {results ? (
        <div className="wb-domain-results">
          {Array.isArray(results) ? results.map((r) => (
            <div key={r.domain} className="wb-domain-row">
              <span className="wb-domain-name">{r.domain}</span>
              {r.available ? (
                <>
                  <span className="wb-domain-price">${r.price}/yr</span>
                  <button
                    type="button"
                    className="eyf-button"
                    disabled={purchasing}
                    onClick={() => handlePurchase(r.domain)}
                    style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}
                  >
                    {purchasing ? 'Processing...' : 'Purchase'}
                  </button>
                </>
              ) : (
                <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Unavailable</span>
              )}
            </div>
          )) : (
            <p style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>No results.</p>
          )}
          {purchaseError ? (
            <p style={{ color: 'var(--error, #f87171)', fontSize: '0.875rem', marginTop: '0.5rem' }}>{purchaseError}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
