<template lang="pug">
#home
  p Select a tab on the left to get started
  p
    a.has-text-underlined(href="docs/Getting-started.html" target="blank") 
      | Getting Started Guide
      sup
        font-awesome-icon(icon="fas fa-external-link-alt").pl-1.is-size-7
</template>

<style scoped>
#home {
  width: 100%;
  height: 50%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}
</style>
