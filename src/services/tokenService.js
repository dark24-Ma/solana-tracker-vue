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
      return solanaTokens.map(token => {
        // Déterminer l'exchange basé sur l'URL ou d'autres indicateurs
        let exchange = this.determineExchange(token);
        
        // Générer des données financières simulées
        const randomPrice = (Math.random() * 10).toFixed(Math.random() * 8);
        const randomVolume = Math.floor(Math.random() * 1000000);
        const randomLiquidity = Math.floor(Math.random() * 500000);
        const randomPriceChange = (Math.random() * 20 - 10).toFixed(2);
        const randomFdv = Math.floor(Math.random() * 10000000);
        
        return {
          name: token.description || token.tokenAddress.substring(0, 8),
          symbol: token.symbol || '',
          priceUsd: parseFloat(randomPrice),
          liquidity: randomLiquidity,
          volume24h: randomVolume,
          priceChange24h: parseFloat(randomPriceChange),
          fdv: randomFdv,
          pairAddress: '',
          exchange: exchange,
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
        };
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des tokens:', error);
      // En cas d'erreur, retourner un tableau vide
      return [];
    }
  }

  /**
   * Détermine l'exchange utilisé pour un token basé sur diverses caractéristiques
   * @param {Object} token Données brutes du token
   * @returns {string} Nom de l'exchange
   */
  static determineExchange(token) {
    // Par défaut, utiliser Jupiter comme exchange principal
    let exchange = 'jupiter';
    
    // Vérifier si nous avons une URL qui indique l'exchange
    if (token.url) {
      const url = token.url.toLowerCase();
      
      if (url.includes('raydium.io')) {
        exchange = 'raydium';
      } else if (url.includes('jup.ag')) {
        exchange = 'jupiter';
      } else if (url.includes('pumpswap')) {
        exchange = 'pumpswap';
      } else if (url.includes('phoenix.app')) {
        exchange = 'phoenix';
      } else if (url.includes('orca.so')) {
        exchange = 'orca';
      } else if (url.includes('meteora.ag')) {
        exchange = 'meteora';
      }
    }
    
    // Vérifier les liens pour avoir plus d'informations
    if (token.links && Array.isArray(token.links)) {
      for (const link of token.links) {
        if (link.url) {
          const url = link.url.toLowerCase();
          
          if (url.includes('raydium.io') && link.label?.toLowerCase().includes('trade')) {
            exchange = 'raydium';
            break;
          } else if (url.includes('jup.ag') && link.label?.toLowerCase().includes('trade')) {
            exchange = 'jupiter';
            break;
          } else if (url.includes('pumpswap') && link.label?.toLowerCase().includes('trade')) {
            exchange = 'pumpswap';
            break;
          } else if (url.includes('phoenix.app') && link.label?.toLowerCase().includes('trade')) {
            exchange = 'phoenix';
            break;
          } else if (url.includes('orca.so') && link.label?.toLowerCase().includes('trade')) {
            exchange = 'orca';
            break;
          } else if (url.includes('meteora.ag') && link.label?.toLowerCase().includes('trade')) {
            exchange = 'meteora';
            break;
          }
        }
      }
    }
    
    return exchange;
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
    // Liste d'exchanges pour la variété
    const exchanges = ['jupiter', 'raydium', 'orca', 'phoenix', 'meteora', 'pumpswap'];
    const randomExchange = exchanges[Math.floor(Math.random() * exchanges.length)];
    
    // Générer une adresse de paire aléatoire
    const generateRandomAddress = () => {
      let addr = '';
      const chars = '0123456789abcdef';
      for (let i = 0; i < 44; i++) {
        addr += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return addr;
    };
    
    // Calculer un prix basé sur l'index pour avoir des variations
    const price = (Math.random() * index * 0.1).toFixed(Math.random() * 8);
    
    return {
      address: `demo-token-${index}`,
      mint: `demo-mint-${index}`,
      name: `Demo Token ${index}`,
      symbol: `DT${index}`,
      decimals: 9,
      totalSupply: index * 1000000,
      priceUsd: parseFloat(price),
      volume24h: Math.floor(Math.random() * 1000000),
      liquidity: Math.floor(Math.random() * 500000),
      priceChange24h: (Math.random() * 20 - 10).toFixed(2),
      fdv: Math.floor(Math.random() * 10000000),
      pairAddress: generateRandomAddress(),
      marketCap: index * 100000,
      exchange: randomExchange,
      createdAt: new Date().toISOString(),
      description: `Ceci est un token de démonstration numéro ${index} pour tester l'interface utilisateur.`,
      logoURI: '',
      isNew: index % 3 === 0 // Certains tokens marqués comme nouveaux
    };
  }
}

export default TokenService; 