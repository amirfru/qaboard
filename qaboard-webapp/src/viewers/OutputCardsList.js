import React from "react";
import qs from "qs";

import {
  FormGroup,
  InputGroup,
  Callout,
  Intent,
} from "@blueprintjs/core";

import { Section } from "../components/layout";
import { BitAccuracyForm } from "./bit_accuracy/utils";
import { sortOutputs } from "../utils";
import { OutputCard } from "./OutputCard";


class OutputCardsList extends React.Component {
  constructor(props) {
    super(props);
    const params = new URLSearchParams(window.location.search);

    this.state = {
      outputs: this.orderedOutputs(props),
      select_debug: "",
      // bit-accuracy controls
      show_all_files: params.get("show_all_files") === 'true' || false,
      expand_all: params.get("expand_all") === 'true' || false,
      files_filter: params.get("files_filter") || '',
    };
  }

  orderedOutputs = props => {
    const { new_batch, sort_by, sort_order } = props;
    if (new_batch === undefined || new_batch === null)
      return []
    return Object.entries(new_batch.outputs)
                 .filter( ([id, output]) => output.output_type !== "optim_iteration")
                 .sort(sortOutputs(sort_by, sort_order))
  }

  componentDidUpdate(prevProps, prevState) {
    const has_outputs = !!this.props.new_batch && !!this.props.new_batch.outputs;
    const had_outputs = !!prevProps.new_batch && !!prevProps.new_batch.outputs;
    let updated_outputs = has_outputs && (!had_outputs || (had_outputs && prevProps.new_batch.outputs !== this.props.new_batch.outputs));

    const has_ref_batch= !!this.props.ref_batch;
    const had_ref_batch = !!prevProps.ref_batch;
    let updated_ref_batch = has_ref_batch && (!had_ref_batch || (had_ref_batch && prevProps.ref_batch !== this.props.ref_batch))

    if (updated_outputs || updated_ref_batch) {
      this.setState({outputs: this.orderedOutputs(this.props)})      
    }
}

  render() {
    const { project, project_data, new_commit, ref_batch } = this.props;
    const { type, controls } = this.props;
    const { outputs, show_all_files, expand_all, files_filter, select_debug } = this.state;
    const misc_output_props = {
      project,
      project_data,
      commit: new_commit,
      controls,
      type,
      show_all_files,
      files_filter,
      expand_all,
      select_debug,
    }
    return (
      <>
        {type === 'bit_accuracy' && <BitAccuracyForm
                                     show_all_files={show_all_files}
                                     expand_all={expand_all}
                                     files_filter={files_filter}
                                     toggle={this.toggle}
                                     update={this.update}
                                    />
        }
        {controls.show_debug && (
          <FormGroup
            label="Show debug outputs matching"
            labelFor="show-debug-input"
            helperText="You can select any number of debug outputs."
            style={{ marginBottom: "30px" }}
          >
            <InputGroup
              value={this.state.select_debug_input}
              placeholder="ransac points"
              onChange={e => this.setState({ select_debug: e.target.value })}
              leftIcon="series-add"
              style={{ width: "300px" }}
            />
          </FormGroup>
        )}
        {!!ref_batch.label && ref_batch.label !== "default" && this.props.sorted_extra_parameters.length > 0 && (
          <Section><Callout intent={Intent.WARNING}>
            We compare each output to <strong>any</strong> reference outputs
            with matching recording+configuration+platform,{" "}
            <strong>without looking at the tuning parameters</strong>.
          </Callout></Section>
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            flexFlow: "row wrap",
          }}
        >
          {outputs.map( ([id, output]) => {
              return (
                <OutputCard
                  key={id}
                  output_type={output.output_type}
                  output_new={output}
                  output_ref={ref_batch.outputs[output.reference_id]}
                  dispatch={this.props.dispatch}
                  {...misc_output_props}
                />
              );
            })}
        </div>
      </>
    );
  }


  
  update = (attribute, attribute_url) => e => {
    const value = (e.target && e.target.value !==undefined) ? e.target.value : e;
    let query = qs.parse(window.location.search.substring(1));
    this.setState({[attribute_url || attribute]: value,})
    this.props.history.push({
      pathname: window.location.pathname,
      search: qs.stringify({
        ...query,
        [attribute_url || attribute]: value,
      })
    });
  }

  toggle = name => () => {
    this.setState({[name]: !this.state[name]})
    let query = qs.parse(window.location.search.substring(1));
    this.props.history.push({
      pathname: window.location.pathname,
      search: qs.stringify({
        ...query,
        [name]: !this.state[name],
      })
    });
  }

}



export { OutputCardsList }