<script>
  import Suggested from "./Suggested.svelte"
</script>

<section>
  <h2>My improvement suggestions</h2>
  <ul>
    <li>The widget could be improved by mimicking <a href="https://www.inmotion.app/" target="_blank">Motion</a>'s style/UI</li>
    <li>
      <p>There is a lot of unused white space and unnecessary scrolling in the plugin popup (see the attached screenshots for the current version and for a suggestion of improvement).</p>
      <div class="container">
        <div class="current">
          <h3>Current State</h3>
          <img src="current.JPG" alt="peach plugin screeshot" width=300>
        </div>
        <div class="suggested">
          <h3>Suggested</h3>
          <Suggested/>
        </div>
      </div>
    </li>
  </ul>
</section>

<style>
img {
  max-width: 300px;
  border-top: 1px solid rgba(0, 0, 0, 0.3);
}
a {
  color: #f27442;
}
.container {
  display: flex;
  justify-content: center;
}
.container>div {
  display: flex;
  align-items: center;
  flex-direction: column;
}
</style>