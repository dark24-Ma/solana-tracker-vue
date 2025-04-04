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
      // Récupérer d'abord les profils de tokens
      const profilesResponse = await fetch('https://api.dexscreener.com/token-profiles/latest/v1');
      if (!profilesResponse.ok) {
        throw new Error(`Erreur HTTP: ${profilesResponse.status}`);
      }
      
      const profilesData = await profilesResponse.json();
      
      // Filtrer pour ne garder que les tokens Solana
      const solanaProfiles = Array.isArray(profilesData) 
        ? profilesData.filter(token => token.chainId === 'solana')
        : [];
      
      // Récupérer les données de prix depuis Dexscreener pour les tokens Solana
      const pairsPromises = [];
      const chunkSize = 10; // Traiter les tokens par groupes de 10 pour éviter de surcharger l'API
      
      // Diviser les tokens en chunks
      for (let i = 0; i < solanaProfiles.length; i += chunkSize) {
        const chunk = solanaProfiles.slice(i, i + chunkSize);
        
        // Pour chaque token dans le chunk, récupérer les données de paires
        const chunkPromises = chunk.map(async (token) => {
          try {
            const pairResponse = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${token.tokenAddress}`);
            if (!pairResponse.ok) {
              console.warn(`Impossible de récupérer les données pour ${token.tokenAddress}`);
              return null;
            }
            
            const pairData = await pairResponse.json();
            return { profile: token, pairs: pairData.pairs || [] };
          } catch (error) {
            console.warn(`Erreur lors de la récupération des données pour ${token.tokenAddress}:`, error);
            return null;
          }
        });
        
        pairsPromises.push(...chunkPromises);
        
        // Attendre un peu entre chaque chunk pour ne pas surcharger l'API
        if (i + chunkSize < solanaProfiles.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // Attendre que toutes les requêtes soient terminées
      const tokensWithPairs = await Promise.all(pairsPromises);
      
      // Transformer les données pour correspondre au format attendu par notre application
      return tokensWithPairs
        .filter(item => item !== null)
        .map(item => {
          const { profile, pairs } = item;
          
          // Trouver la meilleure paire (avec la liquidité la plus élevée)
          const bestPair = pairs.length > 0 
            ? pairs.sort((a, b) => parseFloat(b.liquidity?.usd || 0) - parseFloat(a.liquidity?.usd || 0))[0] 
            : null;
          
          // Déterminer l'exchange basé sur l'URL ou d'autres indicateurs
          let exchange = this.determineExchange(profile);
          
          // Si on a une paire, on peut récupérer l'exchange depuis la paire
          if (bestPair && bestPair.dexId) {
            exchange = bestPair.dexId.toLowerCase();
          }
          
          return {
            name: profile.description || profile.tokenAddress.substring(0, 8),
            symbol: profile.symbol || '',
            priceUsd: bestPair ? parseFloat(bestPair.priceUsd || 0) : 0,
            liquidity: bestPair ? parseFloat(bestPair.liquidity?.usd || 0) : 0,
            volume24h: bestPair ? parseFloat(bestPair.volume?.h24 || 0) : 0,
            priceChange24h: bestPair ? parseFloat(bestPair.priceChange?.h24 || 0) : 0,
            fdv: bestPair ? parseFloat(bestPair.fdv || 0) : 0,
            pairAddress: bestPair ? bestPair.pairAddress : '',
            exchange: exchange,
            createdAt: bestPair ? new Date(bestPair.createAt || Date.now()).toISOString() : new Date().toISOString(),
            mint: profile.tokenAddress,
            address: profile.tokenAddress,
            logoURI: profile.icon || '',
            headerURI: profile.header || '',
            links: profile.links || [],
            website: profile.links?.find(link => link.label === 'Website')?.url || '',
            twitter: profile.links?.find(link => link.type === 'twitter')?.url || '',
            isMemecoin: true,
            tokenType: 'memecoin',
            isNew: bestPair ? this.isNewToken(bestPair.createAt) : true,
            description: profile.description || '',
            url: bestPair ? bestPair.url : profile.url || ''
          };
        });
    } catch (error) {
      console.error('Erreur lors de la récupération des tokens:', error);
      // En cas d'erreur, retourner un tableau vide
      return [];
    }
  }

  /**
   * Vérifie si un token est récent (moins de 24h)
   * @param {string} createAtStr Date de création du token
   * @returns {boolean} Vrai si le token est récent
   */
  static isNewToken(createAtStr) {
    if (!createAtStr) return false;
    
    try {
      const createAt = new Date(createAtStr);
      const now = new Date();
      const diff = now - createAt;
      
      // Token récent si créé il y a moins de 24h
      return diff < 24 * 60 * 60 * 1000;
    } catch (e) {
      return false;
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