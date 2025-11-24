// It should be something like:

<Autocomplete
  :label="autocompleteLabel"
  :suggestions="autocompleteSuggestions"
  @selectSuggestion="handleSelectSuggestion"
>
      <div
        ref="mirror"
        class="mirror"
      >
        <span ref="textBeforeCursor"></span>
        <span
          ref="floatingLabel"
          class="floating-label"
        ></span>
      </div>
      <textarea
        ref="promptTextarea"
        class="chat-input"
        :class="{ disabled: props.disabled }"
        rows="1"
        :value="text"
        :disabled="props.disabled"
        autocomplete="off"
        @input="onInputMessage"
        @keydown="handleTextareaKeydown"
        @keydown.tab.prevent="onTab"
      />
</Autocomplete>