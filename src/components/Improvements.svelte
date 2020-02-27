<script>
  import Suggested from "./Suggested.svelte"
</script>

<section>
  <h2>My improvement suggestions</h2>
  <ul>
    <li>The widget could improved following the <a href="https://www.inmotion.app/" target="_blank">Motion</a>'s one style</li>
    <li>
      <p>In the website and mainly in the plugin popup there is a lot of unused white space and an unnecessary scroll.</p>
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
}
.container>div {
  flex: 1;
  display: flex;
  align-items: center;
  flex-direction: column;
}
.cta {
  margin-top: 20px;
  font-size: 1.2rem;
  font-weight: bold;
}
</style>