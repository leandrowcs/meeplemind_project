export const CHANGELOG_BY_LANGUAGE = {
  'pt-BR': {
    title: 'Novidades',
    items: [
      'v2.5.0: Estatísticas agora exibem mini-capas nos rankings, Perfil ganhou jogos diferentes + tempo total + gamificação/medalhas e Histórico recebeu layout novo com header moderno e fundo com capa no item expandido.',
      'v2.4.9: Nova Partida virou wizard em 5 etapas com transições, testes e2e atualizados e Biblioteca com adição manual + edição de nome/categorias/mecânicas/tipo.',
      'v2.4.8: Exportacao CSV nativa (2 arquivos) sem xlsx para reduzir risco de dependencia vulneravel.',
      'v2.4.7: Instruções da IA padronizadas e hardening de segurança para sanitização/importação de dados.',
      'v2.4.6: Configurações migradas para i18n completo + card BGG com aviso legal e indicador de cache offline no catalogo.',
      'v2.4.5: Perfil de Configurações com status Google + conexão direta; sync BGG agora gera arquivo offline.',
      'v2.4.4: Ajuste de camadas do menu lateral na página Biblioteca.',
      'v2.4.3: Novidades movidas para changelog dedicado + ajustes de menu na Biblioteca.',
      'v2.4.2: Painel de novidades + sync BGG nas configurações.',
      'v2.4.1: Área de backup detalhada na página de configurações.',
      'v2.4.0: Menu lateral otimizado e seletor de idioma por bandeiras.',
    ],
  },
  'en-US': {
    title: "What's New",
    items: [
      'v2.5.0: Statistics now show mini cover badges in rankings, Profile gained unique-games/time-played/gamification medals, and History received a modern header plus cover background on expanded cards.',
      'v2.4.9: New Game is now a 5-step wizard with transitions, e2e coverage updated, and Library supports manual add + editable name/categories/mechanics/type.',
      'v2.4.8: Native 2-file CSV export replaces xlsx usage to reduce vulnerable dependency risk.',
      'v2.4.7: Standardized AI coding instructions and stronger security hardening for input/data import sanitization.',
      'v2.4.6: Settings moved to full i18n + BGG card now includes legal notice and offline-cache indicator in catalog.',
      'v2.4.5: Settings profile now shows Google status + direct connection; BGG sync now generates an offline file.',
      'v2.4.4: Layering fix for side menu on Library page.',
      'v2.4.3: Release notes moved to a dedicated changelog + menu fixes in Library.',
      'v2.4.2: Release notes panel + BGG sync action in settings.',
      'v2.4.1: Detailed backup area in settings page.',
      'v2.4.0: Improved side menu and flag-based language selector.',
    ],
  },
  'fr-CA': {
    title: 'Nouveautes',
    items: [
      'v2.5.0: Les statistiques affichent des mini-couvertures dans les classements, le profil ajoute jeux differents/temps de jeu/gamification, et l\'historique adopte un nouveau header avec fond de couverture en mode etendu.',
      'v2.4.9: Nouvelle partie en assistant 5 etapes avec transitions, tests e2e mis a jour, et Bibliotheque avec ajout manuel + edition du nom/categories/mecaniques/type.',
      'v2.4.8: Export CSV natif en 2 fichiers, sans xlsx, pour reduire le risque lie aux dependances vulnerables.',
      'v2.4.7: Instructions IA standardisees et renforcement de securite pour la sanitisation des saisies/imports.',
      'v2.4.6: Paramètres migrés vers un i18n complet + carte BGG avec mention légale et indicateur de cache hors ligne dans le catalogue.',
      'v2.4.5: Le profil des paramètres affiche le statut Google + connexion directe; la sync BGG génère maintenant un fichier hors ligne.',
      'v2.4.4: Correctif de superposition du menu latéral dans Bibliothèque.',
      'v2.4.3: Nouveautés migrées vers un fichier changelog dédié + correctifs de menu dans Bibliothèque.',
      'v2.4.2: Zone nouveautés + action sync BGG dans les paramètres.',
      'v2.4.1: Zone de sauvegarde détaillée dans la page paramètres.',
      'v2.4.0: Menu latéral optimisé et sélecteur de langue par drapeaux.',
    ],
  },
};

export const getChangelog = (language, maxItems = 3) => {
  const selected = CHANGELOG_BY_LANGUAGE[language] || CHANGELOG_BY_LANGUAGE['pt-BR'];
  return {
    ...selected,
    items: (selected.items || []).slice(0, maxItems),
  };
};
