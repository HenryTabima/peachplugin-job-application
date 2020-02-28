<section>
  <h2>Here a couple of issues I found</h2>
  <ul>
    <li>The Plugin logs into the browser console (wich could be a security issue), and is uncomfortable to use when working as a developer (see the screenshot below).</li>
    <li>Once you move the widget offscreen on the left side, it's near impossible to get it back.</li>
    <li>I told my best friend to try the plugin, but he was getting NaN as peach count, so there may be some issue there (see the screenshot below).</li>
  </ul>
  <div class="img-container">
    <img alt="Logs in console" src="logs.JPG" width=400/>
    <img alt="NaN counter" src="NaN.jpg" widt=300 height=100/>
  </div>
  <p>PS: I have worked with Firebase before.</p>
</section>

<style>
ul {
  max-width: 600px;
}
.img-container {
  display: flex;
  justify-content: center;
}
</style>