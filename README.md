# GoDaddy Open Source Center

Source code for GoDaddy's GitHub page at [godaddy.github.io](https://godaddy.github.io). Created and maintained by our engineers, this site contains blog posts about the technology and tools we're using at GoDaddy to create software which empowers small businesses around the world to build and market their digital identities.

### Development

Clone or download this repository.

```
git clone git@github.com:godaddy/godaddy.github.io.git
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

## Pages

#### Theme front matter

In addition to the default [page front matter](https://jekyllrb.com/docs/frontmatter/), the following variables can be utilized:

| Variable | Description |
| --- | --- |
| `hide` | Prevents the page from being included in the site navigation |
| `order` | Controls the page order for top navigation items |
| `slug` | Used to create unique body class selectors |
| `title` | Used in the document title, Open Graph and Twitter meta, site navigation, and masthead |
