---
title: C02
---

# {{ page.dir | remove: "/" }}

[← Back](../)

{% assign audio_exts = ".wav,.mp3,.ogg,.flac,.aif,.aiff,.m4a" | split: "," %}
{% for f in site.static_files %}
{% assign ext = f.extname | downcase %}
{% if f.path contains page.dir and audio_exts contains ext %}
<p>
  <strong>{{ f.name }}</strong>{% if f.name contains "_FAV" %} ★{% endif %}<br>
  <audio controls preload="none" src="{{ f.path | relative_url }}"></audio>
</p>
{% endif %}
{% endfor %}
