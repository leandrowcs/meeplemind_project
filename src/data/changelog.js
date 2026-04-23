export const CHANGELOG_BY_LANGUAGE = {
  'pt-BR': {
    title: 'Novidades',
    items: [
      'v2.5.4: Card de maior rival agora exibe todos os empatados (critério: mais partidas + mais vitórias contra o usuário). Biblioteca ganhou upload de capa por arquivo + validação de URL. Perfil exibe badge de conta Google conectada. Reestruturação visual dos mini-stats do perfil.',
      'v2.5.3: Welcome ganhou seleção de idioma por bandeiras no rodapé, texto de apresentação mais claro, logo maior e botão Google centralizado.',
      'v2.5.2: Welcome agora oferece login com Google na primeira tela para recuperar histórico e biblioteca do Drive antes de informar nome manualmente.',
      'v2.5.1: Perfil refinado com card Conquistas (abas em progresso/concluídas), modal explicativo de XP, barra de progresso corrigida e pódio competitivo com ouro/prata/bronze.',
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
      'v2.5.4: Top rival card now shows all tied rivals (ranked by most games together, then most wins against you). Library gained cover image upload + URL validation. Profile displays a Google connected badge. Profile mini-stats visuals were restructured.',
      'v2.5.3: Welcome now includes bottom flag language selection, clearer product intro copy, a larger logo, and centered Google sign-in button content.',
      'v2.5.2: Welcome now offers Google sign-in on first launch to restore history and library from Drive before manual name entry.',
      'v2.5.1: Profile now has a refined Achievements card (in-progress/completed tabs), XP help modal, corrected progress fill behavior, and a competitive podium with gold/silver/bronze placements.',
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
      'v2.5.4: La carte du grand rival affiche désormais tous les ex-æquo (critère : plus de parties ensemble, puis plus de victoires contre vous). La bibliothèque propose l\'upload de couverture par fichier + validation d\'URL. Le profil affiche un badge de compte Google connecté. Restructuration visuelle des mini-stats du profil.',
      'v2.5.3: L\'écran de bienvenue ajoute le sélecteur de langue par drapeaux en bas, un texte de présentation plus clair, un logo agrandi et un bouton Google visuellement centré.',
      'v2.5.2: L\'écran de bienvenue propose maintenant la connexion Google dès le départ pour restaurer l\'historique et la bibliothèque Drive avant la saisie manuelle du nom.',
      'v2.5.1: Profil amélioré avec carte Succès (onglets en cours/terminés), modal d\'explication XP, remplissage des barres corrigé et podium compétitif or/argent/bronze.',
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
