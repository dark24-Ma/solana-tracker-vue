<template>
  <div class="token-detail-container">
    <div class="card border-0 shadow-lg">
      <div class="card-header bg-dark d-flex justify-content-between align-items-center">
        <div class="d-flex align-items-center">
          <div class="token-logo-wrapper me-3">
            <img 
              :src="token.logoURI || getDefaultLogo(token)" 
              :alt="token.name"
              class="token-logo"
              @error="handleImageError($event, token)"
            >
          </div>
          <div>
            <h2 class="mb-0 token-title">{{ token.name }} <span class="token-symbol">({{ token.symbol }})</span></h2>
            <div class="token-address">
              <small>{{ token.address ? token.address.substring(0, 10) + '...' + token.address.substring(token.address.length - 6) : 'N/A' }}</small>
              <button class="btn btn-sm btn-link p-0 ms-2" v-if="token.address" @click="copyToClipboard(token.address)">
                <i class="fas fa-copy"></i>
              </button>
            </div>
          </div>
        </div>
        <button class="btn-close-custom" @click="$emit('close')">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <div class="card-body">
        <!-- Indicateur d'Exchange -->
        <div class="exchange-indicator mb-3 fade-in" v-if="token.exchange">
          <span class="exchange-badge" :class="getExchangeClass(token.exchange)">
            <i class="fas fa-exchange-alt me-2"></i>{{ formatExchangeName(token.exchange) }}
          </span>
        </div>
        
        <!-- Source des données -->
        <div class="data-source mb-4 fade-in" style="--delay: 0.05s">
          <a href="https://dexscreener.com" target="_blank" class="dexscreener-badge">
            <img src="https://dexscreener.com/favicon.png" alt="DexScreener" width="16" height="16" class="me-1"> 
            Données fournies par DexScreener
          </a>
          <div class="data-update-time">
            <i class="fas fa-sync-alt me-1"></i> Mise à jour {{ getUpdateTime() }}
          </div>
        </div>
        
        <!-- Prix et statistiques -->
        <div class="row mb-4 fade-in" style="--delay: 0.1s">
          <div class="col-md-6 mb-3 mb-md-0">
            <div class="price-card">
              <div class="price-label">
                <i class="fas fa-money-bill-wave me-2"></i>
                Prix actuel
              </div>
              <div class="price-value">{{ formatPrice(token.priceUsd) }}</div>
              <div class="price-change" :class="{'text-success': token.priceChange24h > 0, 'text-danger': token.priceChange24h < 0}">
                <i :class="token.priceChange24h > 0 ? 'fas fa-arrow-up' : 'fas fa-arrow-down'"></i>
                {{ formatPriceChange(token.priceChange24h) }}
              </div>
            </div>
          </div>
          <div class="col-md-6">
            <div class="stats-grid">
              <div class="stat-item">
                <div class="stat-label">
                  <i class="fas fa-chart-line me-2"></i>
                  Volume 24h
                </div>
                <div class="stat-value">{{ formatNumber(token.volume24h) }}</div>
              </div>
              <div class="stat-item">
                <div class="stat-label">
                  <i class="fas fa-tint me-2"></i>
                  Liquidité
                </div>
                <div class="stat-value">{{ formatNumber(token.liquidity) }}</div>
              </div>
              <div class="stat-item">
                <div class="stat-label">
                  <i class="fas fa-coins me-2"></i>
                  FDV
                </div>
                <div class="stat-value">{{ formatNumber(token.fdv) }}</div>
              </div>
              <div class="stat-item">
                <div class="stat-label">
                  <i class="fas fa-calendar-alt me-2"></i>
                  Date création
                </div>
                <div class="stat-value">{{ formatDate(token.createdAt) }}</div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Description du token -->
        <div class="token-description mb-4 fade-in" style="--delay: 0.2s" v-if="token.description">
          <h5>Description</h5>
          <p>{{ token.description }}</p>
        </div>
        
        <!-- Graphique de prix -->
        <div class="price-chart-container mb-4 fade-in" style="--delay: 0.3s">
          <h5>Évolution du prix</h5>
          <div class="chart-placeholder" v-if="!chartData.length">
            <div class="text-center py-5">
              <i class="fas fa-chart-line fa-3x mb-3 text-muted"></i>
              <p>Les données de graphique ne sont pas disponibles pour ce token</p>
            </div>
          </div>
          <div v-else ref="chartContainer" class="chart-container"></div>
        </div>
        
        <!-- Liens externes -->
        <div class="external-links mb-4 fade-in" style="--delay: 0.4s">
          <h5>Liens</h5>
          <div class="d-flex flex-wrap gap-2">
            <a v-if="token.url" :href="token.url" target="_blank" class="btn btn-outline-primary">
              <i class="fas fa-chart-bar me-2"></i> Dexscreener
            </a>
            <a :href="`https://solscan.io/token/${token.address}`" target="_blank" class="btn btn-outline-primary">
              <i class="fas fa-search me-2"></i> Solscan
            </a>
            <a v-for="(link, idx) in token.links" :key="idx" 
               :href="link.url" target="_blank" 
               class="btn" 
               :class="getLinkButtonClass(link.type || link.label)">
               <i :class="getLinkIcon(link.type || link.label) + ' me-2'"></i> 
               {{ link.label || getLinkLabel(link.type) }}
            </a>
          </div>
        </div>
        
        <!-- Données de transaction -->
        <div class="transaction-data fade-in" style="--delay: 0.5s">
          <h5>Données de transaction</h5>
          <div class="row">
            <div class="col-md-6 mb-3 mb-md-0">
              <div class="transaction-items">
                <div class="transaction-item">
                  <div class="transaction-label">
                    <i class="fas fa-exchange-alt me-2"></i>
                    Exchange
                  </div>
                  <div class="transaction-value">
                    <span :class="getExchangeClass(token.exchange)">
                      {{ formatExchangeName(token.exchange) }}
                    </span>
                  </div>
                </div>
                <div class="transaction-item">
                  <div class="transaction-label">
                    <i class="fas fa-link me-2"></i>
                    Adresse de paire
                  </div>
                  <div class="transaction-value">
                    {{ token.pairAddress ? token.pairAddress.substring(0, 8) + '...' + token.pairAddress.substring(token.pairAddress.length - 6) : 'N/A' }}
                    <button class="btn btn-sm btn-link p-0 ms-2" v-if="token.pairAddress" @click="copyToClipboard(token.pairAddress)">
                      <i class="fas fa-copy"></i>
                    </button>
                  </div>
                </div>
                <div class="transaction-item">
                  <div class="transaction-label">
                    <i class="fas fa-chart-pie me-2"></i>
                    Supply totale
                  </div>
                  <div class="transaction-value">
                    {{ token.totalSupply ? formatLargeNumber(token.totalSupply) : 'N/A' }}
                  </div>
                </div>
              </div>
            </div>
            <div class="col-md-6 mt-3 mt-md-0">
              <div class="transaction-buttons">
                <button class="btn btn-success btn-lg w-100 mb-3" @click="openTradeUrl">
                  <i class="fas fa-exchange-alt me-2"></i> Trader ce token
                </button>
                <button class="btn btn-outline-primary btn-lg w-100 mb-2" @click="setTokenAlert">
                  <i class="fas fa-bell me-2"></i> Définir une alerte de prix
                </button>
                <div class="d-flex gap-2 w-100">
                  <a :href="`https://solscan.io/token/${token.address}`" target="_blank" class="btn btn-outline-info flex-grow-1">
                    <i class="fas fa-search me-1"></i> Solscan
                  </a>
                  <a v-if="token.url" :href="token.url" target="_blank" class="btn btn-outline-success flex-grow-1">
                    <i class="fas fa-chart-line me-1"></i> Dexscreener
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, watch } from 'vue';

export default {
  name: 'TokenDetail',
  props: {
    token: {
      type: Object,
      required: true
    }
  },
  // eslint-disable-next-line no-unused-vars
  setup(props, { emit }) {
    const chartContainer = ref(null);
    const chartInstance = ref(null);
    const chartData = ref([]);
    const alertShown = ref(false);
    
    // Fonctions formatage
    const formatPrice = (price) => {
      if (!price || isNaN(price) || price === 0) return '$0.00';
      
      // Formater les petits prix avec plus de décimales pour Solana
      if (price < 0.0000001) {
        // Format scientifique pour les prix extrêmement petits
        return `$${price.toExponential(4)}`;
      } else if (price < 0.00001) {
        return `$${price.toFixed(10)}`;
      } else if (price < 0.0001) {
        return `$${price.toFixed(9)}`;
      } else if (price < 0.001) {
        return `$${price.toFixed(8)}`;
      } else if (price < 0.01) {
        return `$${price.toFixed(6)}`;
      } else if (price < 0.1) {
        return `$${price.toFixed(5)}`;
      } else if (price < 1) {
        return `$${price.toFixed(4)}`;
      } else if (price < 10) {
        return `$${price.toFixed(3)}`;
      } else if (price < 1000) {
        return `$${price.toFixed(2)}`;
      } else {
        // Pour les grands nombres, utiliser le formatage standard avec séparateurs
        return `$${price.toLocaleString('fr-FR', { 
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })}`;
      }
    };
    
    const formatPriceChange = (change) => {
      if (!change || isNaN(change)) return '0.00%';
      return `${change > 0 ? '+' : ''}${change.toFixed(2)}%`;
    };
    
    const formatNumber = (num) => {
      if (!num || isNaN(num) || num === 0) return '$0';
      
      // Formater les grands nombres
      if (num >= 1000000000) {
        return `$${(num / 1000000000).toFixed(2)}B`;
      } else if (num >= 1000000) {
        return `$${(num / 1000000).toFixed(2)}M`;
      } else if (num >= 1000) {
        return `$${(num / 1000).toFixed(2)}K`;
      } else {
        return `$${num.toLocaleString('fr-FR')}`;
      }
    };
    
    const formatLargeNumber = (num) => {
      if (!num || isNaN(num) || num === 0) return '0';
      
      // Formater les grands nombres sans le symbole $
      if (num >= 1000000000000) {
        return `${(num / 1000000000000).toFixed(2)}T`;
      } else if (num >= 1000000000) {
        return `${(num / 1000000000).toFixed(2)}B`;
      } else if (num >= 1000000) {
        return `${(num / 1000000).toFixed(2)}M`;
      } else if (num >= 1000) {
        return `${(num / 1000).toFixed(2)}K`;
      } else {
        return num.toLocaleString('fr-FR');
      }
    };
    
    const formatDate = (dateString) => {
      if (!dateString) return '';
      
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch (e) {
        return 'Date invalide';
      }
    };
    
    const getDefaultLogo = (token) => {
      // Générer une couleur basée sur le hash du nom/symbole du token
      const hash = (str) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
          hash = ((hash << 5) - hash) + str.charCodeAt(i);
          hash |= 0;
        }
        return hash;
      };
      
      const colorHash = Math.abs(hash(token.name + token.symbol)) % 360;
      
      // Si le token a un symbole, utiliser la première lettre
      if (token.symbol) {
        return `https://ui-avatars.com/api/?name=${token.symbol.charAt(0)}&background=hsl(${colorHash},70%,60%)&color=fff&size=60&font-size=0.5&length=1&bold=true`;
      } else {
        return `https://ui-avatars.com/api/?name=${token.name.charAt(0)}&background=hsl(${colorHash},70%,60%)&color=fff&size=60&font-size=0.5&length=1&bold=true`;
      }
    };
    
    const handleImageError = (event, token) => {
      event.target.src = getDefaultLogo(token);
    };
    
    const copyToClipboard = (text) => {
      navigator.clipboard.writeText(text).then(() => {
        if (!alertShown.value) {
          alertShown.value = true;
          // Afficher une notification toast
          const toast = document.createElement('div');
          toast.className = 'toast show position-fixed top-0 end-0 m-3';
          toast.setAttribute('role', 'alert');
          toast.style.zIndex = '9999';
          toast.innerHTML = `
            <div class="toast-header bg-success text-white">
              <strong class="me-auto">Copié !</strong>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
            </div>
            <div class="toast-body">
              Adresse copiée dans le presse-papier.
            </div>
          `;
          document.body.appendChild(toast);
          
          setTimeout(() => {
            document.body.removeChild(toast);
            alertShown.value = false;
          }, 3000);
        }
      }).catch(err => {
        console.error('Erreur lors de la copie dans le presse-papier :', err);
      });
    };
    
    const openTradeUrl = () => {
      // Ouvrir le lien de trading selon l'exchange
      let tradeUrl = '';
      
      if (props.token.exchange === 'raydium') {
        tradeUrl = `https://raydium.io/swap/?inputCurrency=SOL&outputCurrency=${props.token.address}`;
      } else if (props.token.exchange === 'jupiter') {
        tradeUrl = `https://jup.ag/swap/SOL-${props.token.address}`;
      } else if (props.token.exchange === 'pumpswap') {
        tradeUrl = `https://pumpswap.fun/swap?outputCurrency=${props.token.address}`;
      } else if (props.token.exchange === 'phoenix') {
        tradeUrl = `https://phoenix.app/swap?in=So11111111111111111111111111111111111111112&out=${props.token.address}`;
      } else if (props.token.exchange === 'orca') {
        tradeUrl = `https://www.orca.so/swapv2?inputMint=So11111111111111111111111111111111111111112&outputMint=${props.token.address}`;
      } else if (props.token.exchange === 'meteora') {
        tradeUrl = `https://app.meteora.ag/swap/SOL/${props.token.address}`;
      } else if (props.token.url) {
        // Si on a l'URL de Dexscreener, on utilise celle-là
        tradeUrl = props.token.url;
      } else {
        // Par défaut, utiliser Jupiter
        tradeUrl = `https://jup.ag/swap/SOL-${props.token.address}`;
      }
      
      window.open(tradeUrl, '_blank');
    };
    
    const setTokenAlert = () => {
      alert('Fonctionnalité d\'alerte de prix à venir !');
    };
    
    const getLinkButtonClass = (type) => {
      const typeClasses = {
        'Website': 'btn-outline-primary',
        'website': 'btn-outline-primary',
        'twitter': 'btn-outline-info',
        'telegram': 'btn-outline-primary',
        'discord': 'btn-outline-secondary',
        'medium': 'btn-outline-dark',
        'github': 'btn-outline-dark'
      };
      return typeClasses[type] || 'btn-outline-secondary';
    };
    
    const getLinkIcon = (type) => {
      const typeIcons = {
        'Website': 'fas fa-globe',
        'website': 'fas fa-globe',
        'twitter': 'fab fa-twitter',
        'telegram': 'fab fa-telegram',
        'discord': 'fab fa-discord',
        'medium': 'fab fa-medium',
        'github': 'fab fa-github'
      };
      return typeIcons[type] || 'fas fa-link';
    };
    
    const getLinkLabel = (type) => {
      const typeLabels = {
        'website': 'Site Web',
        'twitter': 'Twitter',
        'telegram': 'Telegram',
        'discord': 'Discord',
        'medium': 'Medium',
        'github': 'GitHub'
      };
      return typeLabels[type] || type;
    };
    
    // Formater le nom de l'exchange pour l'affichage
    const formatExchangeName = (exchange) => {
      if (!exchange) return 'N/A';
      
      const exchangeNames = {
        'jupiter': 'Jupiter',
        'raydium': 'Raydium',
        'pumpswap': 'Pumpswap',
        'phoenix': 'Phoenix',
        'orca': 'Orca',
        'meteora': 'Meteora'
      };
      
      return exchangeNames[exchange] || exchange.charAt(0).toUpperCase() + exchange.slice(1);
    };
    
    // Récupérer la classe CSS pour l'exchange
    const getExchangeClass = (exchange) => {
      if (!exchange) return '';
      
      const exchangeClasses = {
        'jupiter': 'exchange-jupiter',
        'raydium': 'exchange-raydium',
        'pumpswap': 'exchange-pumpswap',
        'phoenix': 'exchange-phoenix',
        'orca': 'exchange-orca',
        'meteora': 'exchange-meteora'
      };
      
      return exchangeClasses[exchange] || '';
    };
    
    // Simulation de données pour le graphique
    const generateChartData = () => {
      // Simuler des données de prix sur 7 jours
      const data = [];
      const now = new Date();
      const price = props.token.priceUsd || 0.01;
      
      // Générer des données aléatoires basées sur le prix actuel
      for (let i = 30; i >= 0; i--) {
        const date = new Date(now);
        date.setHours(now.getHours() - i * 8);
        
        // Prix fluctuant de +/- 15% autour du prix actuel
        const volatilityFactor = 0.15;  
        const randomFactor = 1 + (Math.random() * 2 - 1) * volatilityFactor;
        const randomPrice = price * randomFactor;
        
        data.push({
          time: date.getTime() / 1000,
          value: randomPrice
        });
      }
      
      return data;
    };
    
    // Initialiser le graphique
    const initChart = () => {
      if (!chartContainer.value) return;
      
      import('lightweight-charts').then(LightweightCharts => {
        // Générer des données simulées
        chartData.value = generateChartData();
        
        // Créer le graphique
        const chart = LightweightCharts.createChart(chartContainer.value, {
          width: chartContainer.value.clientWidth,
          height: 400,
          layout: {
            backgroundColor: '#1E222D',
            textColor: '#d1d4dc',
          },
          grid: {
            vertLines: {
              color: 'rgba(42, 46, 57, 0.5)',
            },
            horzLines: {
              color: 'rgba(42, 46, 57, 0.5)',
            },
          },
          crosshair: {
            mode: LightweightCharts.CrosshairMode.Normal,
          },
          rightPriceScale: {
            borderColor: 'rgba(197, 203, 206, 0.8)',
          },
          timeScale: {
            borderColor: 'rgba(197, 203, 206, 0.8)',
          },
        });
        
        // Ajouter la série de prix
        const areaSeries = chart.addAreaSeries({
          topColor: 'rgba(38, 198, 218, 0.56)',
          bottomColor: 'rgba(38, 198, 218, 0.04)',
          lineColor: 'rgba(38, 198, 218, 1)',
          lineWidth: 2,
        });
        
        areaSeries.setData(chartData.value);
        
        // Redimensionner le graphique lors du redimensionnement de la fenêtre
        const handleResize = () => {
          if (chart && chartContainer.value) {
            chart.applyOptions({ width: chartContainer.value.clientWidth });
          }
        };
        
        window.addEventListener('resize', handleResize);
        
        chartInstance.value = {
          chart,
          cleanup: () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
          }
        };
      }).catch(err => {
        console.error('Erreur lors du chargement du graphique:', err);
      });
    };
    
    // Nettoyer le graphique lors du démontage
    onUnmounted(() => {
      if (chartInstance.value && chartInstance.value.cleanup) {
        chartInstance.value.cleanup();
      }
    });
    
    // Initialiser le graphique après le montage
    onMounted(() => {
      initChart();
    });
    
    // Réinitialiser le graphique lorsque le token change
    watch(() => props.token, () => {
      if (chartInstance.value && chartInstance.value.cleanup) {
        chartInstance.value.cleanup();
      }
      initChart();
    });
    
    // Afficher quand les données ont été mises à jour
    const getUpdateTime = () => {
      return 'à l\'instant';
    };
    
    return {
      chartContainer,
      chartData,
      formatPrice,
      formatPriceChange,
      formatNumber,
      formatLargeNumber,
      formatDate,
      getDefaultLogo,
      handleImageError,
      copyToClipboard,
      openTradeUrl,
      setTokenAlert,
      getLinkButtonClass,
      getLinkIcon,
      getLinkLabel,
      formatExchangeName,
      getExchangeClass,
      getUpdateTime
    };
  }
};
</script>

<style scoped>
.token-detail-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 1rem;
}

.card {
  background-color: #121212;
  border-color: rgba(153, 69, 255, 0.3);
  animation: fade-in-up 0.4s ease-out;
}

@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-in {
  animation: fade-in 0.5s ease-out forwards;
  animation-delay: var(--delay, 0s);
  opacity: 0;
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.card-header {
  background-color: #0a0a0a !important;
  border-bottom: 1px solid rgba(153, 69, 255, 0.2);
}

.card-body {
  background-color: #121212;
  color: #e0e0e0;
}

.btn-close-custom {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: rgba(153, 69, 255, 0.1);
  border: 1px solid rgba(153, 69, 255, 0.3);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-close-custom:hover {
  background-color: rgba(153, 69, 255, 0.3);
  transform: rotate(90deg);
}

.token-logo-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  background-color: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 15px rgba(153, 69, 255, 0.3);
  border: 1px solid rgba(153, 69, 255, 0.2);
}

.token-logo {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.token-title {
  color: white;
  font-size: 1.5rem;
  font-weight: 600;
}

.token-symbol {
  color: rgba(255, 255, 255, 0.7);
  font-size: 1rem;
  font-weight: normal;
}

.token-address {
  color: rgba(255, 255, 255, 0.5);
}

.price-card {
  background: linear-gradient(135deg, rgba(153, 69, 255, 0.15), rgba(20, 20, 20, 0.5));
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(153, 69, 255, 0.2);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.price-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, transparent, rgba(153, 69, 255, 0.05));
  opacity: 0;
  transition: opacity 0.3s ease;
}

.price-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(153, 69, 255, 0.4);
}

.price-card:hover::before {
  opacity: 1;
}

.price-label {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
}

.price-value {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: white;
  text-shadow: 0 0 10px rgba(153, 69, 255, 0.5);
}

.price-change {
  font-size: 1rem;
  font-weight: 500;
  padding: 0.2rem 0.5rem;
  border-radius: 50px;
  display: inline-block;
  background-color: rgba(0, 0, 0, 0.3);
}

.text-success {
  color: #14f195 !important;
  text-shadow: 0 0 8px rgba(20, 241, 149, 0.3);
}

.text-danger {
  color: #f14d7b !important;
  text-shadow: 0 0 8px rgba(241, 77, 123, 0.3);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  height: 100%;
}

.stat-item {
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 0.8rem;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(153, 69, 255, 0.1);
  transition: all 0.3s ease;
}

.stat-item:hover {
  background-color: rgba(153, 69, 255, 0.1);
  transform: translateY(-3px);
  box-shadow: 0 5px 15px rgba(153, 69, 255, 0.2);
}

.stat-label {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 0.3rem;
  display: flex;
  align-items: center;
}

.stat-value {
  font-size: 1.1rem;
  font-weight: 600;
  color: white;
  text-shadow: 0 0 5px rgba(255, 255, 255, 0.1);
}

.chart-container {
  height: 400px;
  width: 100%;
  background-color: #1E222D;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(153, 69, 255, 0.2);
}

.chart-placeholder {
  height: 400px;
  background-color: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(153, 69, 255, 0.1);
}

.transaction-items {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.transaction-item {
  margin-bottom: 0;
  background-color: rgba(255, 255, 255, 0.03);
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid rgba(153, 69, 255, 0.1);
  transition: all 0.3s ease;
}

.transaction-item:hover {
  background-color: rgba(153, 69, 255, 0.08);
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(153, 69, 255, 0.2);
}

.transaction-label {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 0.3rem;
  display: flex;
  align-items: center;
}

.transaction-value {
  font-size: 1rem;
  color: white;
  word-break: break-all;
  display: flex;
  align-items: center;
}

.token-description {
  background: linear-gradient(135deg, rgba(20, 20, 20, 0.8), rgba(10, 10, 10, 0.9));
  border-radius: 8px;
  padding: 1.5rem;
  border: 1px solid rgba(153, 69, 255, 0.2);
  position: relative;
  overflow: hidden;
}

.token-description::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(45deg, transparent, rgba(153, 69, 255, 0.05), transparent);
  background-size: 200% 200%;
  animation: glow 3s linear infinite;
  pointer-events: none;
}

.token-description p {
  position: relative;
  z-index: 1;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.6;
  margin-bottom: 0;
}

@keyframes glow {
  0% {
    background-position: 0% 0%;
  }
  50% {
    background-position: 100% 100%;
  }
  100% {
    background-position: 0% 0%;
  }
}

h5 {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: white;
  border-bottom: 1px solid rgba(153, 69, 255, 0.2);
  padding-bottom: 0.5rem;
  display: flex;
  align-items: center;
}

h5::before {
  content: '';
  display: inline-block;
  width: 4px;
  height: 16px;
  background: linear-gradient(to bottom, #9945ff, #6f4cff);
  margin-right: 8px;
  border-radius: 2px;
}

.btn-success {
  background: linear-gradient(135deg, #9945ff, #6f4cff);
  border: none;
  box-shadow: 0 4px 15px rgba(153, 69, 255, 0.4);
  position: relative;
  overflow: hidden;
  z-index: 1;
}

.btn-success::after {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(153, 69, 255, 0.3) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.6s;
  z-index: -1;
  pointer-events: none;
}

.btn-success:hover {
  background: linear-gradient(135deg, #b369ff, #8666ff);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(153, 69, 255, 0.5);
}

.btn-success:hover::after {
  opacity: 1;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(0.8);
    opacity: 0.8;
  }
  50% {
    transform: scale(1);
    opacity: 0.4;
  }
  100% {
    transform: scale(0.8);
    opacity: 0.8;
  }
}

.btn-outline-primary {
  border-color: rgba(153, 69, 255, 0.5);
  color: rgba(153, 69, 255, 0.9);
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
}

.btn-outline-primary:hover {
  background-color: rgba(153, 69, 255, 0.1);
  border-color: rgba(153, 69, 255, 0.9);
  color: rgba(153, 69, 255, 1);
  box-shadow: 0 0 15px rgba(153, 69, 255, 0.4);
}

.btn-outline-primary:focus {
  box-shadow: 0 0 0 3px rgba(153, 69, 255, 0.3);
}

.external-links {
  background-color: rgba(20, 20, 20, 0.5);
  border-radius: 8px;
  padding: 1.2rem;
  border: 1px solid rgba(153, 69, 255, 0.1);
}

@media (max-width: 768px) {
  .token-title {
    font-size: 1.2rem;
  }
  
  .price-value {
    font-size: 1.5rem;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
}

.shadow-lg {
  box-shadow: 0 1rem 3rem rgba(0, 0, 0, 0.4) !important;
}

.exchange-badge {
  display: inline-block;
  padding: 0.5rem 1rem;
  border-radius: 50px;
  font-weight: bold;
  font-size: 0.9rem;
  background-color: rgba(0, 0, 0, 0.4);
  box-shadow: 0 0 15px rgba(153, 69, 255, 0.3);
  border: 1px solid rgba(153, 69, 255, 0.3);
}

.exchange-jupiter {
  color: #6f4cff;
  text-shadow: 0 0 5px rgba(111, 76, 255, 0.6);
}

.exchange-raydium {
  color: #5ac4be;
  text-shadow: 0 0 5px rgba(90, 196, 190, 0.6);
}

.exchange-pumpswap {
  color: #ff5b5b;
  text-shadow: 0 0 5px rgba(255, 91, 91, 0.6);
}

.exchange-phoenix {
  color: #ff9e5b;
  text-shadow: 0 0 5px rgba(255, 158, 91, 0.6);
}

.exchange-orca {
  color: #41b3a3;
  text-shadow: 0 0 5px rgba(65, 179, 163, 0.6);
}

.exchange-meteora {
  color: #9e45ff;
  text-shadow: 0 0 5px rgba(158, 69, 255, 0.6);
}

.data-source {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.6);
  padding: 0.5rem 0;
  border-bottom: 1px dashed rgba(153, 69, 255, 0.2);
  margin-bottom: 1rem;
}

.dexscreener-badge {
  display: flex;
  align-items: center;
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  transition: all 0.2s ease;
}

.dexscreener-badge:hover {
  color: white;
  text-shadow: 0 0 5px rgba(255, 255, 255, 0.5);
}

.data-update-time {
  font-style: italic;
}
</style> 