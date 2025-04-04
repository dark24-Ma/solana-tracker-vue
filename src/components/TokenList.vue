<template>
  <div class="token-list-container">
    <!-- Système d'alertes en haut de la page -->
    <div class="alerts-container mb-3" v-if="alerts.length > 0">
      <div v-for="alert in alerts" :key="alert.id" 
           class="alert alert-dismissible fade show mb-2" 
           :class="`alert-${alert.type}`" 
           role="alert">
        <i :class="getAlertIcon(alert.type)" class="me-2"></i>
        {{ alert.message }}
        <button type="button" class="btn-close" 
                @click="removeAlert(alert.id)" 
                aria-label="Fermer"></button>
      </div>
    </div>

    <!-- Modal pour les détails du token -->
    <div class="token-detail-modal" v-if="selectedToken" @click.self="closeTokenDetail">
      <div class="token-detail-content" @click.stop>
        <TokenDetail :token="selectedToken" @close="closeTokenDetail" />
      </div>
    </div>

    <div class="dashboard-header mb-4">
      <h1 class="token-list-title">Surveillance des Tokens Solana</h1>
      <div class="filters d-flex align-items-center mb-3">
        <div class="search-container me-3">
          <div class="input-group">
            <span class="input-group-text">
              <i class="fas fa-search"></i>
            </span>
            <input 
              type="text" 
              class="form-control" 
              placeholder="Rechercher un token..." 
              v-model="searchQuery" 
              @input="filterTokens"
            >
          </div>
        </div>
        <div class="sort-container">
          <div class="input-group">
            <span class="input-group-text">
              <i class="fas fa-sort"></i>
            </span>
            <select class="form-select" v-model="sortOption" @change="sortTokens">
              <option value="newest">Plus récents</option>
              <option value="oldest">Plus anciens</option>
              <option value="priceHigh">Prix (élevé à bas)</option>
              <option value="priceLow">Prix (bas à élevé)</option>
              <option value="name">Nom (A-Z)</option>
              <option value="marketCapHigh">Cap. Marché (élevé à bas)</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="text-center p-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Chargement...</span>
      </div>
      <p class="mt-3 text-secondary">Chargement des tokens...</p>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="alert alert-danger border-0" role="alert" style="background-color: rgba(220, 53, 69, 0.1); color: var(--danger-color);">
      <i class="fas fa-exclamation-triangle me-2"></i>
      {{ error }}
    </div>

    <!-- Empty state -->
    <div v-else-if="filteredTokens.length === 0" class="text-center p-5">
      <i class="fas fa-coins fa-3x mb-3 text-primary"></i>
      <h5 class="text-bright">Aucun token trouvé</h5>
      <p class="text-secondary">Les nouveaux tokens apparaîtront ici dès qu'ils seront détectés.</p>
    </div>

    <!-- Tokens grid layout -->
    <div v-else>
      <!-- Admin Panel - Toujours visible -->
      <div class="admin-panel mb-4">
        <div class="card">
          <div class="card-header d-flex justify-content-between align-items-center" 
               @click="logsMinimized = !logsMinimized" 
               style="cursor: pointer;">
            <h5 class="mb-0">
              <i :class="logsMinimized ? 'fas fa-chevron-right' : 'fas fa-chevron-down'" class="me-2"></i>
              <i class="fas fa-terminal me-2"></i> Activité en temps réel
              <span class="badge bg-primary ms-2" v-if="clientCount > 0">{{ clientCount }} utilisateur(s)</span>
            </h5>
            <div>
              <button class="btn btn-sm btn-primary me-2" @click.stop="checkSolscan" :disabled="checkingSolscan">
                <i class="fas fa-sync-alt me-1" :class="{'fa-spin': checkingSolscan}"></i> 
                Vérifier maintenant
              </button>
              <button class="btn btn-sm btn-outline-secondary" @click.stop="clearLogs">
                <i class="fas fa-trash-alt me-1"></i> Effacer
              </button>
              <button class="btn btn-sm btn-outline-info ms-2" @click.stop="addSystemStatusLog">
                <i class="fas fa-info-circle me-1"></i> Statut
              </button>
            </div>
          </div>
          <div class="card-body p-0" v-show="!logsMinimized">
            <div class="logs-container">
              <div v-for="(log, index) in logs" :key="index" class="log-item" :class="log.type">
                <span class="log-time">{{ formatLogTime(log.time) }}</span>
                <span class="log-type" :class="'log-' + log.type">{{ log.type.toUpperCase() }}</span>
                <span class="log-message">{{ log.message }}</span>
              </div>
              <div v-if="logs.length === 0" class="text-secondary text-center py-3">
                Aucun événement enregistré pour le moment
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="row g-3">
        <div v-for="token in paginatedTokens" :key="token.mint" class="col-12 col-md-6 col-lg-4">
          <div class="token-card" :class="{'new-token': token.isNew && isNewToken(token)}" @click="showTokenDetail(token)">
            <div class="card h-100 shadow-sm hover-shadow pointer">
              <div class="card-body">
                <div class="d-flex align-items-center mb-3">
                  <div class="token-logo-wrapper me-3">
                    <img 
                      :src="token.logoURI || getDefaultLogo(token)" 
                      :alt="token.name"
                      class="token-logo"
                      @error="handleImageError($event, token)"
                    >
                  </div>
                  <div class="token-title-container">
                    <h5 class="token-name mb-0 text-truncate">
                      {{ token.name }}
                      <span v-if="isNewToken(token)" class="badge bg-success ms-2">Nouveau</span>
                    </h5>
                    <div class="token-symbol">{{ token.symbol }}</div>
                  </div>
                </div>
                
                <div class="token-details">
                  <div class="row g-2">
                    <div class="col-6">
                      <div class="detail-label">
                        <i class="fas fa-info-circle me-1 text-info"></i> Chaîne
                      </div>
                      <div class="detail-value">
                        Solana
                      </div>
                    </div>
                    <div class="col-6">
                      <div class="detail-label">
                        <i class="fas fa-link me-1 text-primary"></i> Adresse
                      </div>
                      <div class="detail-value">
                        {{ token.address ? token.address.substring(0, 6) + '...' + token.address.substring(token.address.length - 4) : 'N/A' }}
                      </div>
                    </div>
                    <div class="col-6">
                      <div class="detail-label">
                        <i class="fas fa-money-bill-wave me-1 text-success"></i> Prix
                      </div>
                      <div class="detail-value">
                        {{ formatPrice(token.priceUsd) }}
                        <span 
                          v-if="token.priceChange24h" 
                          :class="token.priceChange24h > 0 ? 'text-success' : 'text-danger'"
                          class="ms-1 price-change-badge"
                        >
                          <i :class="token.priceChange24h > 0 ? 'fas fa-caret-up' : 'fas fa-caret-down'"></i>
                          {{ token.priceChange24h.toFixed(2) }}%
                        </span>
                      </div>
                    </div>
                    <div class="col-6">
                      <div class="detail-label">
                        <i class="fas fa-chart-line me-1 text-primary"></i> Volume 24h
                      </div>
                      <div class="detail-value">
                        {{ formatNumber(token.volume24h) }}
                      </div>
                    </div>
                    <div class="col-6">
                      <div class="detail-label">
                        <i class="fas fa-exchange-alt me-1 text-warning"></i> Exchange
                      </div>
                      <div class="detail-value">
                        <span :class="getExchangeClass(token.exchange)">
                          {{ formatExchangeName(token.exchange) }}
                        </span>
                      </div>
                    </div>
                    <div class="col-6">
                      <div class="detail-label">
                        <i class="fas fa-tint me-1 text-info"></i> Liquidité
                      </div>
                      <div class="detail-value">
                        {{ formatNumber(token.liquidity) }}
                      </div>
                    </div>
                    <div class="col-12" v-if="token.description">
                      <div class="detail-label">
                        <i class="fas fa-file-alt me-1 text-warning"></i> Description
                      </div>
                      <div class="detail-value description-text">
                        {{ token.description }}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div class="token-actions mt-3">
                  <div class="d-flex justify-content-between align-items-center">
                    <small class="text-secondary">
                      <i class="far fa-clock me-1"></i> {{ formatDate(token.createdAt) }}
                    </small>
                    <div class="d-flex">
                      <a v-if="token.url" :href="token.url" target="_blank" class="btn btn-sm btn-outline-success me-2">
                        <i class="fas fa-external-link-alt me-1"></i> Dexscreener
                      </a>
                      <a :href="`https://solscan.io/token/${token.mint}`" target="_blank" class="btn btn-sm btn-outline-primary">
                        <i class="fas fa-external-link-alt me-1"></i> Explorer
                      </a>
                    </div>
                  </div>
                  <div class="mt-2" v-if="token.links && token.links.length > 0">
                    <div class="d-flex flex-wrap gap-2">
                      <a v-for="(link, idx) in token.links" :key="idx" 
                         :href="link.url" target="_blank" 
                         class="btn btn-sm" 
                         :class="getLinkButtonClass(link.type || link.label)">
                         <i :class="getLinkIcon(link.type || link.label) + ' me-1'"></i> 
                         {{ link.label || getLinkLabel(link.type) }}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Pagination -->
      <div v-if="filteredTokens.length > itemsPerPage" class="pagination-container mt-4">
        <nav>
          <ul class="pagination justify-content-center">
            <li :class="['page-item', { disabled: currentPage === 1 }]">
              <a class="page-link" href="#" @click.prevent="currentPage = 1">
                <i class="fas fa-angle-double-left"></i>
              </a>
            </li>
            <li :class="['page-item', { disabled: currentPage === 1 }]">
              <a class="page-link" href="#" @click.prevent="currentPage--">
                <i class="fas fa-angle-left"></i>
              </a>
            </li>
            
            <li v-for="page in displayedPages" :key="page" :class="['page-item', { active: currentPage === page }]">
              <a class="page-link" href="#" @click.prevent="currentPage = page">{{ page }}</a>
            </li>
            
            <li :class="['page-item', { disabled: currentPage === totalPages }]">
              <a class="page-link" href="#" @click.prevent="currentPage++">
                <i class="fas fa-angle-right"></i>
              </a>
            </li>
            <li :class="['page-item', { disabled: currentPage === totalPages }]">
              <a class="page-link" href="#" @click.prevent="currentPage = totalPages">
                <i class="fas fa-angle-double-right"></i>
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  </div>
</template>

<script>
import { onBeforeUnmount, ref, computed, onMounted, watch } from 'vue';
import io from 'socket.io-client';
import { generateNotificationSound } from '../utils/generateNotificationSound';
import TokenDetail from './TokenDetail.vue';

export default {
  name: 'TokenList',
  components: {
    TokenDetail
  },
  setup() {
    const tokens = ref([]);
    const loading = ref(true);
    const error = ref(null);
    const socket = ref(null);
    const searchQuery = ref('');
    const sortOption = ref('newest');
    const currentPage = ref(1);
    const itemsPerPage = 9;
    const logs = ref([]);
    const logsMinimized = ref(false);
    const clientCount = ref(0);
    const checkingSolscan = ref(false);
    const notificationSound = ref(null);
    const previousTokensLength = ref(0);
    const alerts = ref([]);
    const MAX_ALERTS = 3;
    
    // Variable pour la sélection d'un token et affichage des détails
    const selectedToken = ref(null);
    
    // Variable pour éviter les requêtes simultanées
    const isCurrentlyFetching = ref(false);
    
    // Fonction pour ajouter un log
    const addLog = (type, message) => {
      logs.value.unshift({
        type,
        message,
        time: new Date()
      });
      
      // Limiter à 100 logs maximum
      if (logs.value.length > 100) {
        logs.value = logs.value.slice(0, 100);
      }
    };
    
    // Effacer les logs
    const clearLogs = () => {
      logs.value = [];
    };
    
    // Formater l'heure d'un log
    const formatLogTime = (date) => {
      return date.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    };
    
    // Connexion au backend
    const connectSocket = () => {
      try {
        socket.value = io(process.env.VUE_APP_BACKEND_URL || 'http://localhost:3000');
        
        socket.value.on('connect', () => {
          console.log('Socket.io connecté au serveur');
          addLog('success', 'Connecté au serveur en temps réel');
        });
        
        socket.value.on('newToken', (newToken) => {
          // S'assurer que tokens.value est un tableau
          if (!Array.isArray(tokens.value)) {
            tokens.value = [];
          }
          // Ajouter le nouveau token à la liste
          tokens.value = [newToken, ...tokens.value];
          addLog('info', `Nouveau token détecté: ${newToken.name} (${newToken.symbol})`);
          addAlert('info', `Nouveau token détecté: ${newToken.name} (${newToken.symbol})`);
          // Jouer le son de notification
          playNotificationSound();
        });
        
        socket.value.on('error', (errorMsg) => {
          console.error('Erreur Socket.io:', errorMsg);
          addLog('error', `Erreur: ${errorMsg}`);
          addAlert('danger', `Erreur de connexion: ${errorMsg}`);
        });
        
        socket.value.on('disconnect', () => {
          console.log('Socket.io déconnecté du serveur');
          addLog('warning', 'Déconnecté du serveur en temps réel');
          addAlert('warning', 'Déconnecté du serveur. Tentative de reconnexion...');
        });
        
        socket.value.on('systemLog', (logData) => {
          addLog(logData.type, logData.message);
          
          // Afficher certains logs importants comme alertes
          if (logData.type === 'error' || logData.type === 'warning') {
            addAlert(logData.type === 'error' ? 'danger' : 'warning', logData.message);
          }
        });
        
        socket.value.on('clientCount', (data) => {
          clientCount.value = data.count;
        });
        
        socket.value.on('systemStatus', (statusData) => {
          if (statusData.connectedToSolana) {
            addLog('success', `Connecté au réseau Solana (${statusData.solanaEndpoint})`);
          } else {
            addLog('error', 'Non connecté au réseau Solana');
          }
          
          if (statusData.connectedToMongoDB) {
            addLog('success', 'Connecté à la base de données MongoDB');
          } else {
            addLog('error', 'Non connecté à la base de données');
          }
          
          addLog('info', `${statusData.tokenCount || 0} tokens en base de données`);
          addLog('info', `${statusData.clientCount || 0} clients connectés`);
          
          if (statusData.isWatching) {
            addLog('success', 'Surveillance active');
          } else {
            addLog('warning', 'Surveillance inactive');
          }
        });
      } catch (err) {
        console.error('Erreur lors de la connexion au socket:', err);
        addLog('error', `Erreur de connexion: ${err.message}`);
        addAlert('danger', `Impossible de se connecter au serveur: ${err.message}`);
      }
    };
    
    // Fonction pour obtenir l'icône appropriée pour le type d'alerte
    const getAlertIcon = (type) => {
      const icons = {
        'danger': 'fas fa-exclamation-circle',
        'warning': 'fas fa-exclamation-triangle',
        'success': 'fas fa-check-circle',
        'info': 'fas fa-info-circle',
        'primary': 'fas fa-bell',
        'secondary': 'fas fa-cog'
      };
      return icons[type] || 'fas fa-bell';
    };
    
    // Récupérer les tokens depuis l'API
    const fetchTokens = async () => {
      // Éviter les requêtes simultanées
      if (isCurrentlyFetching.value) {
        return;
      }
      
      isCurrentlyFetching.value = true;
      
      if (!loading.value) {
        loading.value = true;
      }
      
      try {
        // Utiliser le service TokenService pour récupérer les tokens
        const TokenServiceModule = await import('../services/tokenService');
        const TokenService = TokenServiceModule.default;
        const tokensData = await TokenService.fetchAllTokens();
        
        if (Array.isArray(tokensData)) {
          // Comparer avec les données existantes pour détecter les nouveaux tokens
          const existingTokenAddresses = new Set(tokens.value.map(t => t.address));
          const newTokens = tokensData.filter(t => !existingTokenAddresses.has(t.address));
          
          if (newTokens.length > 0) {
            // Intégrer les nouveaux tokens sans remplacer tout le tableau
            tokens.value = [...newTokens, ...tokens.value];
            addLog('success', `${newTokens.length} nouveaux tokens détectés`);
            
            // Afficher également une alerte en haut
            addAlert('success', `${newTokens.length} nouveaux tokens détectés`);
          }
        }
      } catch (err) {
        console.error('Erreur lors de la récupération des tokens:', err);
        
        // Déterminer le type d'erreur
        let errorMessage = `Erreur: ${err.message}`;
        let errorType = 'danger';
        
        // Vérifier si c'est une erreur de limite de taux (too many requests)
        if (err.message && err.message.includes('429') || err.message.includes('too many request')) {
          errorMessage = "Limite d'API dépassée. Veuillez attendre avant de réessayer.";
          errorType = 'warning';
        } else if (err.message && err.message.includes('timeout')) {
          errorMessage = "Délai d'attente dépassé. Vérifiez votre connexion.";
          errorType = 'warning';
        } else if (err.message && err.message.includes('network')) {
          errorMessage = "Erreur de connexion réseau. Vérifiez votre connexion internet.";
          errorType = 'warning';
        }
        
        // Afficher l'erreur dans les logs
        addLog('error', errorMessage);
        
        // Afficher l'erreur comme alerte
        addAlert(errorType, errorMessage);
        
        if (!error.value) {
          error.value = errorMessage;
        }
      } finally {
        loading.value = false;
        isCurrentlyFetching.value = false;
      }
    };
    
    // Filtrer les tokens en fonction de la recherche
    const filterTokens = () => {
      currentPage.value = 1; // Revenir à la première page après une recherche
    };
    
    // Filtrer et trier les tokens
    const filteredTokens = computed(() => {
      // Vérifier que tokens.value est un tableau
      if (!tokens.value || !Array.isArray(tokens.value)) {
        return [];
      }
      
      let result = [...tokens.value];
      
      // Filtrer par le texte de recherche
      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase();
        result = result.filter(token => 
          token.name.toLowerCase().includes(query) || 
          token.symbol.toLowerCase().includes(query) ||
          token.mint.toLowerCase().includes(query)
        );
      }
      
      // Trier les tokens
      switch (sortOption.value) {
        case 'newest':
          result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          break;
        case 'oldest':
          result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          break;
        case 'priceHigh':
          result.sort((a, b) => b.price - a.price);
          break;
        case 'priceLow':
          result.sort((a, b) => a.price - b.price);
          break;
        case 'name':
          result.sort((a, b) => a.name.localeCompare(b.name));
          break;
        case 'marketCapHigh':
          result.sort((a, b) => b.marketCap - a.marketCap);
          break;
      }
      
      return result;
    });
    
    // Pagination
    const totalPages = computed(() => Math.ceil(filteredTokens.value.length / itemsPerPage));
    
    const displayedPages = computed(() => {
      const maxDisplayedPages = 5;
      const pages = [];
      let startPage = Math.max(1, currentPage.value - Math.floor(maxDisplayedPages / 2));
      let endPage = Math.min(totalPages.value, startPage + maxDisplayedPages - 1);
      
      if (endPage - startPage + 1 < maxDisplayedPages) {
        startPage = Math.max(1, endPage - maxDisplayedPages + 1);
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      
      return pages;
    });
    
    const paginatedTokens = computed(() => {
      const start = (currentPage.value - 1) * itemsPerPage;
      const end = start + itemsPerPage;
      return filteredTokens.value.slice(start, end);
    });
    
    // Actions
    const sortTokens = () => {
      currentPage.value = 1; // Revenir à la première page après un tri
    };
    
    const formatPrice = (price) => {
      if (!price || isNaN(price) || price === 0) return '$0.00';
      
      // Formater les petits prix avec plus de décimales
      if (price < 0.01) {
        return `$${price.toFixed(8)}`;
      } else if (price < 1) {
        return `$${price.toFixed(4)}`;
      } else {
        return `$${price.toLocaleString('fr-FR', { 
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })}`;
      }
    };
    
    const formatNumber = (num) => {
      if (!num || isNaN(num) || num === 0) return '0';
      
      // Formater les grands nombres
      if (num >= 1000000000) {
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
      
      const date = new Date(dateString);
      const now = new Date();
      const diff = now - date;
      const seconds = Math.floor(diff / 1000);
      
      if (isNaN(seconds)) {
        return '';
      }
      
      if (seconds < 60) {
        return 'À l\'instant';
      } else if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        return `Il y a ${minutes} min${minutes > 1 ? 's' : ''}`;
      } else if (seconds < 86400) {
        const hours = Math.floor(seconds / 3600);
        return `Il y a ${hours} heure${hours > 1 ? 's' : ''}`;
      } else {
        return date.toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
      }
    };
    
    const isNewToken = (token) => {
      const tokenDate = new Date(token.createdAt);
      const now = new Date();
      return (now - tokenDate) < 1000 * 60 * 60; // 1 heure
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
    
    const checkSolscan = () => {
      if (!socket.value || !socket.value.connected) {
        addLog('error', 'Non connecté au serveur');
        return;
      }
      
      checkingSolscan.value = true;
      addLog('info', 'Demande de vérification Solscan envoyée au serveur');
      
      socket.value.emit('checkSolscan');
      
      // Désactiver le bouton pendant 10 secondes pour éviter les abus
      setTimeout(() => {
        checkingSolscan.value = false;
      }, 10000);
    };
    
    const addSystemStatusLog = () => {
      addLog('info', 'Vérification du statut du système...');
      
      if (socket.value && socket.value.connected) {
        socket.value.emit('getSystemStatus');
      } else {
        addLog('error', 'Non connecté au serveur');
      }
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
    
    // Cycle de vie du composant
    onMounted(async () => {
      try {
        // Initialiser le son de notification de manière dynamique
        notificationSound.value = await generateNotificationSound();
        addLog('info', 'Son de notification initialisé');
      } catch (err) {
        console.error('Erreur lors de l\'initialisation du son:', err);
        addLog('error', 'Impossible d\'initialiser le son de notification');
      }
      
      fetchTokens();
      connectSocket();
      
      // Rafraîchir les données toutes les 1 minute
      const refreshInterval = setInterval(async () => {
        addLog('info', 'Vérification automatique des nouveaux tokens...');
        await fetchTokens();
      }, 60000); // 60000ms = 1 minute
      
      // Nettoyer l'intervalle lors du démontage
      onBeforeUnmount(() => {
        clearInterval(refreshInterval);
        if (socket.value) {
          socket.value.disconnect();
        }
      });
      
      // Ajouter un raccourci clavier pour afficher/masquer les logs (Ctrl+Alt+L)
      document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.altKey && e.key === 'l') {
          logsMinimized.value = !logsMinimized.value;
          if (logsMinimized.value) {
            addLog('info', 'Logs minimisés');
          }
        }
      });
    });
    
    // Fonction pour jouer le son de notification
    const playNotificationSound = () => {
      if (notificationSound.value) {
        // Réinitialiser le temps de lecture pour permettre des lectures répétées
        notificationSound.value.currentTime = 0;
        notificationSound.value.play().catch(err => {
          console.error('Erreur lors de la lecture du son:', err);
          addLog('warning', `Impossible de jouer le son de notification: ${err.message}`);
          
          // Si c'est la première fois qu'on rencontre cette erreur, afficher une alerte
          if (err.name === 'NotAllowedError') {
            addAlert('warning', 'L\'interaction utilisateur est requise pour jouer le son. Veuillez cliquer n\'importe où sur la page.');
          }
        });
      }
    };
    
    // Surveiller les tokens pour détecter les nouveaux tokens
    watch(tokens, (newTokens) => {
      if (Array.isArray(newTokens) && previousTokensLength.value > 0 && newTokens.length > previousTokensLength.value) {
        // Nouveaux tokens détectés
        const newTokenCount = newTokens.length - previousTokensLength.value;
        playNotificationSound();
        addLog('success', `${newTokenCount} nouveau(x) token(s) détecté(s)!`);
      }
      previousTokensLength.value = Array.isArray(newTokens) ? newTokens.length : 0;
    });
    
    // Surveiller les changements de page pour éviter les valeurs invalides
    watch(totalPages, (newTotalPages) => {
      if (currentPage.value > newTotalPages) {
        currentPage.value = Math.max(1, newTotalPages);
      }
    });
    
    // Ajoutons une fonction pour ajouter des alertes
    const addAlert = (type, message) => {
      // Générer un ID unique pour l'alerte
      const id = Date.now();
      alerts.value.unshift({ id, type, message });
      
      // Limiter le nombre d'alertes affichées
      if (alerts.value.length > MAX_ALERTS) {
        alerts.value = alerts.value.slice(0, MAX_ALERTS);
      }
      
      // Auto-suppression après 10 secondes pour les alertes qui ne sont pas des erreurs
      if (type !== 'danger') {
        setTimeout(() => {
          removeAlert(id);
        }, 10000);
      }
    };
    
    // Fonction pour supprimer une alerte
    const removeAlert = (id) => {
      alerts.value = alerts.value.filter(alert => alert.id !== id);
    };
    
    const showTokenDetail = (token) => {
      selectedToken.value = token;
      document.body.classList.add('overflow-hidden');
    };
    
    const closeTokenDetail = () => {
      selectedToken.value = null;
      document.body.classList.remove('overflow-hidden');
    };
    
    return {
      tokens,
      loading,
      error,
      searchQuery,
      sortOption,
      currentPage,
      itemsPerPage,
      filteredTokens,
      paginatedTokens,
      totalPages,
      displayedPages,
      filterTokens,
      sortTokens,
      formatPrice,
      formatNumber,
      formatDate,
      isNewToken,
      getDefaultLogo,
      handleImageError,
      logs,
      logsMinimized,
      clearLogs,
      formatLogTime,
      addLog,
      clientCount,
      checkingSolscan,
      checkSolscan,
      addSystemStatusLog,
      getLinkButtonClass,
      getLinkIcon,
      getLinkLabel,
      playNotificationSound,
      notificationSound,
      alerts,
      addAlert,
      removeAlert,
      getAlertIcon,
      selectedToken,
      showTokenDetail,
      closeTokenDetail,
      formatExchangeName,
      getExchangeClass
    };
  }
};
</script>

<style scoped>
.token-list-container {
  padding: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
}

.token-list-title {
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: var(--text-bright);
  font-size: 1.75rem;
}

.search-container {
  flex: 1;
}

.token-card {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  height: 100%;
  cursor: pointer;
}

.pointer {
  cursor: pointer;
}

.hover-shadow {
  border: 1px solid rgba(153, 69, 255, 0.15);
  background: linear-gradient(to bottom, var(--bg-card), rgba(10, 10, 10, 0.95));
}

.hover-shadow:hover {
  box-shadow: 0 10px 25px rgba(153, 69, 255, 0.15), 0 6px 10px rgba(0, 0, 0, 0.3) !important;
  transform: translateY(-5px);
  border: 1px solid rgba(153, 69, 255, 0.3);
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

.token-name {
  font-weight: 600;
  font-size: 1.1rem;
  max-width: 160px;
  color: var(--text-bright);
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.2);
}

.token-symbol {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.detail-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 2px;
}

.detail-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
}

.detail-value.text-success {
  color: var(--success-color) !important;
  text-shadow: 0 0 8px rgba(20, 241, 149, 0.3);
}

.badge {
  font-size: 0.7rem;
  padding: 0.25em 0.5em;
  vertical-align: middle;
}

.pagination-container {
  margin-top: 2rem;
}

.page-link {
  color: var(--primary-color);
  background-color: var(--bg-card);
  border-color: var(--border-color);
}

.page-link:hover {
  color: var(--primary-light);
  background-color: var(--bg-hover);
  border-color: var(--border-color);
}

.page-item.active .page-link {
  background-color: var(--primary-color);
  border-color: var(--primary-color);
  color: var(--text-bright);
}

.page-item.disabled .page-link {
  color: var(--text-muted);
  background-color: var(--bg-card);
  border-color: var(--border-color);
}

.logs-container {
  max-height: 200px;
  overflow-y: auto;
  font-family: 'Courier New', monospace;
  font-size: 0.8rem;
  background-color: var(--bg-dark);
}

.log-item {
  padding: 0.5rem 1rem;
  border-bottom: 1px solid rgba(153, 69, 255, 0.1);
  color: var(--text-secondary);
  transition: all 0.2s ease;
}

.log-item:hover {
  background-color: rgba(153, 69, 255, 0.05);
}

.log-time {
  color: var(--text-muted);
  margin-right: 0.5rem;
}

.log-type {
  display: inline-block;
  padding: 0.2rem 0.4rem;
  border-radius: 3px;
  margin-right: 0.5rem;
  font-size: 0.7rem;
  font-weight: bold;
}

.log-info {
  background-color: rgba(13, 202, 240, 0.1);
}

.log-success {
  background-color: rgba(25, 135, 84, 0.1);
}

.log-error {
  background-color: rgba(220, 53, 69, 0.1);
}

.log-warning {
  background-color: rgba(255, 193, 7, 0.1);
}

.log-info .log-type {
  color: var(--info-color);
}

.log-success .log-type {
  color: var(--success-color);
}

.log-error .log-type {
  color: var(--danger-color);
}

.log-warning .log-type {
  color: var(--warning-color);
}

.log-message {
  word-break: break-word;
  color: var(--text-secondary);
}

/* Styles pour les tableaux dans les logs */
.log-message table {
  margin-top: 0.5rem;
  width: 100%;
  border-collapse: collapse;
}

.log-message table th,
.log-message table td {
  padding: 0.25rem 0.5rem;
  text-align: left;
  border: 1px solid var(--border-color);
}

.log-message table th {
  background-color: var(--bg-hover);
  color: var(--text-primary);
}

.admin-panel .card-header {
  background-color: var(--bg-card);
  color: var(--text-bright);
}

.admin-panel .card-header h5 {
  font-size: 1.1rem;
  font-weight: 500;
  color: var(--text-bright);
}

.btn-outline-primary {
  border-width: 1.5px;
  letter-spacing: 0.5px;
  padding: 0.4rem 0.7rem;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  text-transform: uppercase;
  font-size: 0.7rem;
  font-weight: 600;
}

.btn-outline-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 0 15px rgba(153, 69, 255, 0.4);
}

.btn-sm {
  padding: 0.25rem 0.6rem;
  font-size: 0.7rem;
}

.description-text {
  max-height: 60px;
  overflow-y: auto;
  font-size: 0.8rem;
  padding: 5px;
  background-color: rgba(153, 69, 255, 0.05);
  border-radius: 4px;
  margin-top: 5px;
}

@media (max-width: 767.98px) {
  .filters {
    flex-direction: column;
    align-items: stretch !important;
  }
  
  .search-container, .sort-container {
    width: 100%;
    margin-right: 0 !important;
    margin-bottom: 0.5rem;
  }
}

.token-card.new-token {
  animation: newTokenPulse 2s;
}

@keyframes newTokenPulse {
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(153, 69, 255, 0.7);
  }
  
  50% {
    transform: scale(1.05);
    box-shadow: 0 0 20px 10px rgba(153, 69, 255, 0.5);
  }
  
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(153, 69, 255, 0);
  }
}

.alerts-container {
  position: sticky;
  top: 0;
  z-index: 1000;
}

.alert {
  border-radius: 8px;
  border-left-width: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  animation: slideInDown 0.3s ease-out;
}

.alert-danger {
  background-color: rgba(220, 53, 69, 0.1);
  border-color: var(--danger-color);
  color: var(--danger-color);
}

.alert-warning {
  background-color: rgba(255, 193, 7, 0.1);
  border-color: var(--warning-color);
  color: var(--warning-color);
}

.alert-success {
  background-color: rgba(25, 135, 84, 0.1);
  border-color: var(--success-color);
  color: var(--success-color);
}

.alert-info {
  background-color: rgba(13, 202, 240, 0.1);
  border-color: var(--info-color);
  color: var(--info-color);
}

@keyframes slideInDown {
  from {
    transform: translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.token-detail-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
}

.token-detail-content {
  background-color: #121212;
  border-radius: 12px;
  max-width: 80%;
  max-height: 85%;
  overflow-y: auto;
  box-shadow: 0 0 30px rgba(153, 69, 255, 0.3);
  border: 1px solid rgba(153, 69, 255, 0.3);
}

.exchange-jupiter {
  color: #6f4cff;
  font-weight: bold;
  text-shadow: 0 0 5px rgba(111, 76, 255, 0.4);
}

.exchange-raydium {
  color: #5ac4be;
  font-weight: bold;
  text-shadow: 0 0 5px rgba(90, 196, 190, 0.4);
}

.exchange-pumpswap {
  color: #ff5b5b;
  font-weight: bold;
  text-shadow: 0 0 5px rgba(255, 91, 91, 0.4);
}

.exchange-phoenix {
  color: #ff9e5b;
  font-weight: bold;
  text-shadow: 0 0 5px rgba(255, 158, 91, 0.4);
}

.exchange-orca {
  color: #41b3a3;
  font-weight: bold;
  text-shadow: 0 0 5px rgba(65, 179, 163, 0.4);
}

.exchange-meteora {
  color: #9e45ff;
  font-weight: bold;
  text-shadow: 0 0 5px rgba(158, 69, 255, 0.4);
}

.price-change-badge {
  font-size: 0.75rem;
  font-weight: bold;
  padding: 0.1rem 0.3rem;
  border-radius: 4px;
  background-color: rgba(0, 0, 0, 0.2);
}

.text-success {
  color: #14f195 !important;
}

.text-danger {
  color: #f14d7b !important;
}
</style> 