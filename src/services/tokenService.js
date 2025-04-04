/**
 * Service pour gérer les données des tokens
 */
class TokenService {
  /**
   * Récupère tous les tokens depuis l'API Dexscreener
   * @returns {Promise<Array>} Liste des tokens
   */
  static async fetchAllTokens() {
    try {
      const response = await fetch('https://api.dexscreener.com/token-profiles/latest/v1');
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Filtrer pour ne garder que les tokens Solana
      const solanaTokens = Array.isArray(data) 
        ? data.filter(token => token.chainId === 'solana')
        : [];
      
      // Transformer les données pour correspondre au format attendu par notre application
      return solanaTokens.map(token => ({
        name: token.description || token.tokenAddress.substring(0, 8),
        symbol: token.symbol || '',
        priceUsd: 0, // Ces données ne sont pas dans l'API Dexscreener tokens profiles
        liquidity: 0,
        volume24h: 0,
        priceChange24h: 0,
        fdv: 0,
        pairAddress: '',
        exchange: '',
        createdAt: new Date().toISOString(),
        mint: token.tokenAddress,
        address: token.tokenAddress,
        logoURI: token.icon || '',
        headerURI: token.header || '',
        links: token.links || [],
        website: token.links?.find(link => link.label === 'Website')?.url || '',
        twitter: token.links?.find(link => link.type === 'twitter')?.url || '',
        isMemecoin: true,
        tokenType: 'memecoin',
        isNew: true,
        description: token.description || '',
        url: token.url || ''
      }));
    } catch (error) {
      console.error('Erreur lors de la récupération des tokens:', error);
      // En cas d'erreur, retourner un tableau vide
      return [];
    }
  }

  /**
   * Récupère un token par son adresse
   * @param {string} address Adresse du token
   * @returns {Promise<Object>} Données du token
   */
  static async fetchTokenByAddress(address) {
    try {
      // Pour dexscreener, on pourrait essayer de chercher le token dans la liste complète
      const allTokens = await this.fetchAllTokens();
      const token = allTokens.find(t => t.address === address);
      
      if (token) {
        return token;
      }
      
      throw new Error(`Token non trouvé: ${address}`);
    } catch (error) {
      console.error(`Erreur lors de la récupération du token ${address}:`, error);
      throw error;
    }
  }

  /**
   * Génère des tokens de démonstration
   * @returns {Array} Liste de tokens de démo
   */
  static getDemoTokens() {
    const demoTokens = [];
    for (let i = 1; i <= 20; i++) {
      demoTokens.push(this.createDemoToken(i));
    }
    return demoTokens;
  }

  /**
   * Crée un token de démo avec l'index spécifié
   * @param {number} index Index du token de démo
   * @returns {Object} Token de démo
   */
  static createDemoToken(index) {
    return {
      address: `demo-token-${index}`,
      mint: `demo-mint-${index}`,
      name: `Demo Token ${index}`,
      symbol: `DT${index}`,
      decimals: 9,
      totalSupply: index * 1000000,
      price: index * 0.1,
      volume24h: index * 10000,
      marketCap: index * 100000,
      createdAt: new Date().toISOString()
    };
  }
}

export default TokenService; 