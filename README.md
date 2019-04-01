# GoDaddy Engineering Blog

Source code for GoDaddy's GitHub page at [godaddy.github.io](https://godaddy.github.io). Created and maintained by our engineers, this site contains blog posts about the technology and tools we're using at GoDaddy to create software which empowers small businesses around the world to build and market their digital identities.

### Development

Develop in a fork of the repository. You can use the GitHub 'Fork' button to create your own fork.

Clone your forked repository.

```
git clone git@github.com:YOUR_USERNAME/godaddy.github.io.git
```

Install [Bundler](https://bundler.io/).

```
gem install bundler
```

Install project dependencies.

```
bundle install
```

Build the site on the local preview server.

```
bundle exec jekyll serve
```

The local server listens on http://localhost:4000 by default.

To distribute a preview of your changes, enable GitHub Pages by going to the Settings of your forked repository and set the Source to the `master` branch. Within a minute you should be able to access it at https://YOUR_USERNAME.github.io/godaddy.github.io.

## Theme Front Matter

In addition to the default [page front matter](https://jekyllrb.com/docs/frontmatter/), the following variables can be utilized:

#### Pages

| Variable | Description |
| --- | --- |
| `hide` | Prevents the page from being included in the site navigation |
| `order` | Controls the page order for top navigation items |
| `slug` | Used to create unique body class selectors |
| `title` | Used in the document title, Open Graph and Twitter meta, site navigation, and masthead |

#### Posts

| Variable | Description |
| --- | --- |
| `authors` | A list of authors who contributed to the post |
| `excerpt` | A brief description of the post, used in social previews and meta tags |
| `cover` | A featured image for the blog post |
| `options` | A list of features to enable: `full-bleed-cover` will render a full-width cover photo above the post title |
