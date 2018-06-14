$(function () {
  if (!projects || !$.isArray(projects) || !projects.length > 0) return;
  if (!Fuse || typeof Fuse !== 'function') return;

  var $searchInput = $('.control-project-search');
  var $cards = $('.project-cards .card');

  var fuseOptions = {
    findAllMatches: true,
    threshold: 0.3,
    minMatchCharLength: 2,
    distance: 255,
    keys: ['description', 'name', 'maintainer.name']
  };
  var fuse = new Fuse(projects, fuseOptions);

  function filterQueryMatch(event) {
    var searchFor = event.currentTarget.value;
    var hasQuery = searchFor.length > 0;
    var results = fuse.search(searchFor);
    var matches = results.map(function (project) {
      return project.id;
    });

    $cards.each(function (i, card) {
      var $card = $(card);
      var isMatch = matches.indexOf($card.data('id')) >= 0;

      if (!hasQuery || isMatch) {
        $(card).removeClass('d-none');
      } else {
        $(card).addClass('d-none');
      }
    });
  }

  $searchInput.on('input', filterQueryMatch);
});
